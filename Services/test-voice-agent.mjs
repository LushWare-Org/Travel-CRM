import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient as VoicePrisma } from './voice-service/node_modules/@prisma/client/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:3000';
const STAMP = String(Date.now()).slice(-8);
const RUN_ID = `test-${STAMP}`;
const TEST_NUMBER = '94119999001';
const CALLER_NUMBER = `9477${STAMP}`;

// ── Safety guard: never point this at anything but a local stack ────────────
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(GATEWAY)) {
  console.error(`REFUSING TO RUN: GATEWAY_URL must be localhost, got ${GATEWAY}`);
  process.exit(1);
}

function readEnv(file, key) {
  const text = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const match = text.match(new RegExp(`^${key}=(.*)$`, 'm'));
  if (!match) return null;
  return match[1].trim().replace(/^["'](.*)["']$/, '$1');
}

const SECRET = readEnv('voice-service/.env', 'RETELL_WEBHOOK_SECRET');
if (!SECRET) {
  console.error('RETELL_WEBHOOK_SECRET missing from voice-service/.env');
  process.exit(1);
}
const DB_URL = readEnv('voice-service/.env', 'DIRECT_URL')
  || readEnv('voice-service/.env', 'DATABASE_URL');
if (!DB_URL) {
  console.error('DIRECT_URL/DATABASE_URL missing from voice-service/.env');
  process.exit(1);
}

const { symmetric } = await import('./voice-service/node_modules/retell-sdk/lib/webhook_auth.js');
const sign = (raw) => symmetric.sign(raw, SECRET);

async function postWebhook(route, body, { badSignature = false } = {}) {
  const raw = JSON.stringify(body);
  const res = await fetch(`${GATEWAY}/api/v1/webhooks/voice/${route}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-retell-signature': await sign(badSignature ? 'tampered' : raw),
    },
    body: raw,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

const results = [];
function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`  ${passed ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const prisma = new VoicePrisma({ datasources: { db: { url: DB_URL } } });

async function main() {
  console.log(`\nVoice agent smoke test — ${GATEWAY}\nRun marker: ${RUN_ID}\n`);

  // ── Setup: register the number the "customer" will dial ───────────────────
  console.log('Setup');
  const voiceNumber = await prisma.voiceNumber.create({
    data: {
      e164: TEST_NUMBER,
      label: `Test Line ${RUN_ID}`,
      retellAgentId: `agent_${RUN_ID}`,
      disclosureText: 'This call is recorded.',
    },
  });
  check('registered a test phone number', Boolean(voiceNumber.id));

  // ── 1. Signature rejection ───────────────────────────────────────────────
  console.log('\n1. Security');
  const unsigned = await fetch(`${GATEWAY}/api/v1/webhooks/voice/inbound`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ call_inbound: { from_number: CALLER_NUMBER, to_number: TEST_NUMBER } }),
  });
  check('unsigned webhook is rejected', unsigned.status === 401, `status ${unsigned.status}`);

  const tampered = await postWebhook('inbound', {
    call_inbound: { from_number: CALLER_NUMBER, to_number: TEST_NUMBER },
  }, { badSignature: true });
  check('wrongly signed webhook is rejected', tampered.status === 401, `status ${tampered.status}`);

  // ── 2. Inbound call from an unknown number ───────────────────────────────
  console.log('\n2. Inbound call — unknown caller');
  const inbound = await postWebhook('inbound', {
    event: 'call_inbound',
    call_inbound: { from_number: CALLER_NUMBER, to_number: TEST_NUMBER },
  });
  check('inbound webhook accepted', inbound.status === 200, `status ${inbound.status}`);
  const vars = inbound.body?.call_inbound?.dynamic_variables ?? {};
  check('routed to the agent mapped to this number',
    inbound.body?.call_inbound?.override_agent_id === `agent_${RUN_ID}`);
  check('caller reported as unknown', vars.caller_known === 'false');
  // A UUID appearing in any variable value would mean a record id reached the
  // agent. The `has_open_lead` KEY legitimately contains "lead", so match on
  // the id shape rather than the word.
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  check('no record id leaked to the agent', !UUID.test(Object.values(vars).join(' ')));

  // ── 3. Call ends → lead created ──────────────────────────────────────────
  console.log('\n3. Call ends — lead created');
  const callId = `call_${RUN_ID}`;
  const postCall = await postWebhook('post-call', {
    event: 'call_analyzed',
    call: {
      call_id: callId,
      direction: 'inbound',
      from_number: CALLER_NUMBER,
      to_number: TEST_NUMBER,
      start_timestamp: Date.now() - 200_000,
      end_timestamp: Date.now(),
      duration_ms: 200_000,
      transcript_object: [
        { role: 'agent', content: 'Thanks for calling. How can I help?' },
        { role: 'user', content: 'I want to go to the Maldives in December, two of us.' },
        { role: 'agent', content: 'Our specialist will call you back shortly with options.' },
      ],
      call_analysis: {
        call_summary: `[${RUN_ID}] New Maldives enquiry, 2 travellers, December`,
        user_sentiment: 'Positive',
        custom_analysis_data: { destination: 'Maldives', travelers: 2, duration: 7 },
      },
    },
  });
  check('post-call webhook accepted', postCall.status === 200, `status ${postCall.status}`);

  const call = await prisma.voiceCall.findUnique({ where: { retellCallId: callId } });
  check('call stored with transcript', Array.isArray(call?.transcript) && call.transcript.length === 3);
  check('duration recorded in seconds', call?.durationSec === 200, `${call?.durationSec}s`);
  check('AI summary stored', Boolean(call?.summary));
  check('call linked to a lead', Boolean(call?.leadId), call?.leadId ?? 'none');

  // ── 4. Webhook retry is idempotent ───────────────────────────────────────
  console.log('\n4. Webhook retry (Retell resends on failure)');
  await postWebhook('post-call', {
    event: 'call_analyzed',
    call: {
      call_id: callId,
      direction: 'inbound',
      from_number: CALLER_NUMBER,
      to_number: TEST_NUMBER,
      duration_ms: 200_000,
      transcript_object: [
        { role: 'agent', content: 'Thanks for calling. How can I help?' },
        { role: 'user', content: 'I want to go to the Maldives in December, two of us.' },
        { role: 'agent', content: 'Our specialist will call you back shortly with options.' },
      ],
      call_analysis: { call_summary: `[${RUN_ID}] duplicate delivery` },
    },
  });
  const allCalls = await prisma.voiceCall.findMany({ where: { retellCallId: callId } });
  check('retry did not create a second call row', allCalls.length === 1, `${allCalls.length} row(s)`);

  // ── 5. Repeat caller is now recognised ───────────────────────────────────
  console.log('\n5. Same customer calls again');
  const second = await postWebhook('inbound', {
    event: 'call_inbound',
    call_inbound: { from_number: CALLER_NUMBER, to_number: TEST_NUMBER },
  });
  const secondVars = second.body?.call_inbound?.dynamic_variables ?? {};
  check('caller now recognised', secondVars.caller_known === 'true',
    `caller_known=${secondVars.caller_known}`);
  check('status class exposed, not the raw lifecycle status',
    !['NEW', 'PENDING_VERIFICATION', 'QUOTED'].includes(secondVars.status_class),
    `status_class=${secondVars.status_class}`);
  const UUID2 = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  check('still no record id leaked once the caller is known',
    !UUID2.test(Object.values(secondVars).join(' ')));

  console.log(`\nLead id: ${call?.leadId ?? '(none)'} — open it in Management to see the AI tab.`);
  return call?.leadId;
}

async function cleanup() {
  console.log('\nCleanup');
  const calls = await prisma.voiceCall.findMany({
    where: { OR: [{ retellCallId: { contains: RUN_ID } }, { fromNumber: CALLER_NUMBER }] },
  });
  for (const c of calls) {
    await prisma.voiceCallEvent.deleteMany({ where: { voiceCallId: c.id } });
  }
  const delCalls = await prisma.voiceCall.deleteMany({
    where: { OR: [{ retellCallId: { contains: RUN_ID } }, { fromNumber: CALLER_NUMBER }] },
  });
  const delNums = await prisma.voiceNumber.deleteMany({ where: { e164: TEST_NUMBER } });
  console.log(`  removed ${delCalls.count} call(s), ${delNums.count} number(s)`);
  console.log(`  NOTE: the lead for caller ${CALLER_NUMBER} is left in place so you`);
  console.log('  can open it in Management. Delete it from the Leads page when done.');
}

let leadId;
try {
  leadId = await main();
} catch (err) {
  console.error('\nERROR:', err.message);
  if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
    console.error('Is the stack running?  cd Services && npm run dev');
  }
  results.push({ name: 'run completed', passed: false, detail: err.message });
} finally {
  try { await cleanup(); } catch (e) { console.error('cleanup failed:', e.message); }
  await prisma.$disconnect();
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${'─'.repeat(52)}`);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (leadId) console.log(`Open lead ${leadId} in Management → the ✨AI tab should show 1 call.`);
if (failed.length) {
  console.log('\nFailed:');
  failed.forEach((f) => console.log(`  ✗ ${f.name}${f.detail ? ` — ${f.detail}` : ''}`));
}
process.exit(failed.length ? 1 : 0);

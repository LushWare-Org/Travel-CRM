import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, 'voice-service', '.env');
const DOC_PATH = path.join(__dirname, '..', 'docs', 'voice-agent-prompt.md');
const API = 'https://api.retellai.com';

const ANALYSIS_FIELDS = [
  { type: 'string', name: 'destination', description: 'Where the caller wants to travel. Leave empty if not stated.' },
  { type: 'number', name: 'travelers', description: 'Total number of people travelling, adults and children. Leave empty if not stated.' },
  { type: 'number', name: 'duration', description: 'Number of nights. Leave empty if not stated.' },
  { type: 'string', name: 'budget', description: 'Budget exactly as the caller expressed it, e.g. "around 2000 dollars". Leave empty if not stated.' },
  { type: 'string', name: 'preferences', description: 'Anything else shaping the trip: occasion, dates, departure country, special requests.' },
  { type: 'string', name: 'email', description: 'The caller\'s email address, only if they gave one. Leave empty if not stated.' },
  {
    type: 'string',
    name: 'selected_package_id',
    description: 'The exact package_id from a search_packages result the caller clearly confirmed they want. Only use an id that tool actually returned this call — never invent or guess one. Leave empty if the caller didn\'t confirm a specific package.',
  },
  {
    type: 'boolean',
    name: 'needs_rep_followup',
    description: 'True if a human specialist must call this person back — including whenever the agent said someone would get back to them, or could not answer something. False only if the call was fully resolved and needs nothing further, such as a wrong number.',
  },
];

/**
 * The agent's live in-call tools. Each points at its own fixed URL under
 * /api/v1/webhooks/voice/fn/ — see Services/voice-service/src/routes/tool.routes.js.
 */
function buildTools(baseUrl, toolSecret) {
  const url = (name) => `${baseUrl}/api/v1/webhooks/voice/fn/${name}`;
  const headers = { 'x-retell-tool-secret': toolSecret };
  const common = { type: 'custom', headers, timeout_ms: 8000 };

  return [
    {
      ...common, name: 'search_packages', url: url('search_packages'),
      description: 'Search the company\'s travel packages by destination or keyword. Never mentions price — none is returned.',
      speak_during_execution: true,
      execution_message_description: 'Say something like "let me check our packages for that" while this runs.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Destination or keyword the caller is asking about.' } },
        required: ['query'],
      },
    },
    {
      ...common, name: 'get_trip_status', url: url('get_trip_status'),
      description: 'Get this caller\'s current trip status — destination, dates, travellers, and how far along their enquiry is. Never returns a price.',
      timeout_ms: 4000,
      parameters: { type: 'object', properties: {} },
    },
    {
      ...common, name: 'get_payment_status', url: url('get_payment_status'),
      description: 'Get payment/invoice figures for this caller — ONLY call this when the caller explicitly asks about price, payment, invoice, deposit, or balance. Returns figures only if a quotation was already sent; otherwise say a specialist will follow up.',
      timeout_ms: 4000,
      parameters: { type: 'object', properties: {} },
    },
    {
      ...common, name: 'attach_package', url: url('attach_package'),
      description: 'Attach a package (from search_packages results) to this caller\'s enquiry. Use the package_id from a prior search_packages call — never invent one. Requires trip_confirmed: true — only call this after the caller has explicitly confirmed the trip on file is theirs (or this is a brand new enquiry). If you have not confirmed that yet, ask first; do not call this tool speculatively.',
      speak_during_execution: true,
      execution_message_description: 'Say something like "I\'m adding that to your enquiry" while this runs.',
      parameters: {
        type: 'object',
        properties: {
          package_id: { type: 'string', description: 'The packageId from a prior search_packages result.' },
          trip_confirmed: { type: 'boolean', description: 'True only once the caller has explicitly confirmed this is their trip (or it is a brand new enquiry). Never set true speculatively.' },
        },
        required: ['package_id', 'trip_confirmed'],
      },
    },
    {
      ...common, name: 'adjust_itinerary', url: url('adjust_itinerary'),
      description: 'Record a change the caller wants to their trip — extra or fewer nights, a different hotel, or a different destination. This prepares a draft for a specialist to confirm; it does not commit anything and no price is spoken. Requires trip_confirmed: true — only call this after the caller has explicitly confirmed the trip on file is theirs. If you have not confirmed that yet, ask first; do not call this tool speculatively.',
      // Measured ~8s end-to-end (transaction + pricing recompute + a
      // package-service round trip) — well above the other tools' default,
      // must stay >= ITINERARY_ADJUST_TIMEOUT_MS in lead.client.js.
      timeout_ms: 20000,
      speak_during_execution: true,
      execution_message_description: 'Say something like "let me note that down, one moment" while this runs — it can take several seconds.',
      parameters: {
        type: 'object',
        properties: {
          add_nights: { type: 'integer', description: 'Number of additional nights to add, if any.' },
          remove_nights: { type: 'integer', description: 'Number of nights to remove, if any.' },
          hotel_name: { type: 'string', description: 'The hotel the caller wants instead, if they named one.' },
          destination: { type: 'string', description: 'A different destination the caller wants, if they named one.' },
          trip_confirmed: { type: 'boolean', description: 'True only once the caller has explicitly confirmed this is their trip. Never set true speculatively.' },
        },
        required: ['trip_confirmed'],
      },
    },
    {
      ...common, name: 'preview_price', url: url('preview_price'),
      description: 'Internal only — refreshes the draft price for a specialist to review later. This NEVER returns a number to you and you must never claim to know the new price after calling it. Only use this after adjust_itinerary, and only to prepare the draft — never in response to a caller asking for a price.',
      timeout_ms: 8000,
      parameters: { type: 'object', properties: {} },
    },
    {
      ...common, name: 'resend_document', url: url('resend_document'),
      description: 'Re-send whatever was most recently sent to this caller (quotation, invoice, receipt, or voucher — you don’t choose which), to whatever email and WhatsApp number they have on record. Use this ONLY when the caller asks you to resend, email, or WhatsApp them something — it does nothing if nothing has ever been sent yet.',
      timeout_ms: 18000,
      speak_during_execution: true,
      execution_message_description: 'Say something like "sending that over now, one moment" while this runs.',
      parameters: { type: 'object', properties: {} },
    },
  ];
}

function readEnv(key) {
  const text = fs.readFileSync(ENV_PATH, 'utf8');
  const m = text.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return m ? (m[1].trim().replace(/^["'](.*)["']$/, '$1') || null) : null;
}

function fail(msg, hint) {
  console.error(`\nERROR: ${msg}`);
  if (hint) console.error(hint);
  process.exit(1);
}

/** First fenced block after the given heading. */
function blockAfter(doc, heading) {
  const at = doc.indexOf(heading);
  if (at === -1) return null;
  const fence = doc.indexOf('```', at);
  if (fence === -1) return null;
  const start = doc.indexOf('\n', fence) + 1;
  const end = doc.indexOf('```', start);
  if (end === -1) return null;
  return doc.slice(start, end).trimEnd();
}

async function api(method, route, body, key) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON error body */ }
  if (!res.ok) fail(`Retell ${method} ${route} → ${res.status}\n${text.slice(0, 400)}`);
  return json;
}

const KEY = readEnv('RETELL_WEBHOOK_SECRET');
const AGENT_ID = readEnv('RETELL_AGENT_ID');
if (!KEY) fail('RETELL_WEBHOOK_SECRET missing from voice-service/.env');
if (!AGENT_ID) fail('RETELL_AGENT_ID missing from voice-service/.env');
if (!fs.existsSync(DOC_PATH)) fail(`Not found: ${DOC_PATH}`);

const doc = fs.readFileSync(DOC_PATH, 'utf8');
const beginMessage = blockAfter(doc, '## 1. Begin message');
const generalPrompt = blockAfter(doc, '## 2. General prompt');

if (!beginMessage) fail('Could not find the begin-message block in docs/voice-agent-prompt.md');
if (!generalPrompt || generalPrompt.length < 500) {
  fail('The general-prompt block is missing or suspiciously short — refusing to push a truncated prompt.');
}

// A prompt that lost its money rules in an edit must never reach a live agent.
const REQUIRED_PHRASES = ['Never say a price', 'flight costs or fares', 'Never look someone up'];
const missing = REQUIRED_PHRASES.filter((p) => !generalPrompt.includes(p));
if (missing.length) {
  fail(`The prompt is missing required safety rules: ${missing.join(', ')}`, 'Refusing to push. Restore them in docs/voice-agent-prompt.md.');
}

const apply = process.argv.includes('--apply');

const publicBaseUrl = readEnv('RETELL_PUBLIC_BASE_URL');
const toolSecret = readEnv('RETELL_TOOL_SECRET') || KEY;
let tools = null;
if (!publicBaseUrl) {
  console.log('\nNOTE: RETELL_PUBLIC_BASE_URL is not set in voice-service/.env — skipping the');
  console.log('live in-call tools (search_packages, get_trip_status, get_payment_status,');
  console.log('attach_package, adjust_itinerary, preview_price). Set it to your ngrok/production');
  console.log('URL and re-run to push them. Prompt and analysis fields will still be pushed.');
} else {
  tools = buildTools(publicBaseUrl.replace(/\/$/, ''), toolSecret);
}

const agent = await api('GET', `/get-agent/${AGENT_ID}`, null, KEY);
const llmId = agent?.response_engine?.llm_id;
if (!llmId) fail('This agent has no Retell LLM attached; only single-prompt agents are supported here.');

const llm = await api('GET', `/get-retell-llm/${llmId}`, null, KEY);
// Keep every existing tool that isn't one of ours (e.g. Retell's built-in
// end_call) — this script only owns the six voice-action tools by name.
const OWNED_TOOL_NAMES = new Set(['search_packages', 'get_trip_status', 'get_payment_status', 'attach_package', 'adjust_itinerary', 'preview_price', 'resend_document']);
const keptTools = (llm?.general_tools || []).filter((t) => !OWNED_TOOL_NAMES.has(t.name));
const nextTools = tools ? [...keptTools, ...tools] : (llm?.general_tools || []);

console.log(`\nAgent   ${agent.agent_name}  (${AGENT_ID})`);
console.log(`LLM     ${llmId}`);
console.log(`Voice   ${agent.voice_id} · ${agent.language}`);
console.log(`Webhook ${agent.webhook_url || '(not set)'}`);
console.log(`\nWill push:`);
console.log(`  begin message   ${beginMessage.length} chars`);
console.log(`  general prompt  ${generalPrompt.length} chars`);
console.log(`  analysis fields ${ANALYSIS_FIELDS.map((f) => f.name).join(', ')}`);
console.log(`  live tools      ${tools ? tools.map((t) => t.name).join(', ') : '(skipped — see note above)'}`);

if (!apply) {
  console.log('\nDry run — nothing was changed. Re-run with --apply to write it.\n');
  process.exit(0);
}

await api('PATCH', `/update-retell-llm/${llmId}`, {
  general_prompt: generalPrompt,
  begin_message: beginMessage,
  general_tools: nextTools,
}, KEY);
console.log('\n  ✓ prompt, begin message and tools updated');

await api('PATCH', `/update-agent/${AGENT_ID}`, {
  post_call_analysis_data: ANALYSIS_FIELDS,
}, KEY);
console.log('  ✓ post-call analysis fields set');

console.log('\nDone. Test it in Retell → Test Call. Ask "roughly how much?" — the agent');
console.log('must offer a callback and never say a figure.');
if (tools) {
  console.log('The exact request Retell sends when calling a tool has not been verified');
  console.log('against a real call in this build — the first live test call is what confirms');
  console.log('it (see toolDispatch.controller.js header). Watch that call\'s VoiceCallEvent');
  console.log('rows / logs afterward to confirm the tool calls actually resolved a lead.\n');
} else {
  console.log('');
}

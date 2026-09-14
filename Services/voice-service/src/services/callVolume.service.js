import prisma from '../db/client.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function dailyCap() {
  const n = Number(process.env.VOICE_MAX_CALLS_PER_NUMBER_PER_DAY);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

export async function isOverDailyCap(fromNumber) {
  if (!fromNumber) return { overCap: false, count: 0, cap: dailyCap() };
  const cap = dailyCap();
  const since = new Date(Date.now() - DAY_MS);
  const count = await prisma.voiceCall.count({
    where: { fromNumber, createdAt: { gte: since } },
  });
  return { overCap: count >= cap, count, cap };
}

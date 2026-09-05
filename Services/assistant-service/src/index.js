import 'dotenv/config';
import app from './app.js';
import logger from './config/logger.js';

const PORT = process.env.PORT || 3011;

// Deliberately no eager `prisma.$connect()` (unlike career-service's
// pattern): this service's actual product surface — the LLM turn
// (navigate/answer_faq_policy) — never touches Postgres at all; only the
// fire-and-forget telemetry write does, and events.controller.js already
// catches that failure gracefully at runtime. Prisma Client connects lazily
// on its first query, so a transient DB blip or bad secret at deploy time
// must never crash-loop the whole site-wide assistant over a path only
// telemetry uses (found in /ship's Claude adversarial review).
app.listen(PORT, '0.0.0.0', () => logger.info({ port: PORT }, 'assistant-service started'));

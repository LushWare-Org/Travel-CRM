import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { classifyAssistantIntent } from '../src/ai/assistantRouter.js';
import {
  buildConfusionMatrix,
  evaluateNestedFolds,
  routerCorpusRowSchema,
} from '../src/evaluation/routerEvaluation.js';
import { ASSISTANT_ROUTER_MODEL, ASSISTANT_ROUTER_VERSION } from '../src/ai/prompts/assistantRouter.v1.js';

const argumentsList = process.argv.slice(2);
const validateOnly = argumentsList.includes('--validate-only');
const corpusArgument = argumentsList.find((argument) => !argument.startsWith('--'));
const corpusPath = resolve(corpusArgument || 'evaluation/assistant-router.synthetic.v1.jsonl');

const raw = await readFile(corpusPath, 'utf8');
const rows = raw
  .split('\n')
  .filter(Boolean)
  .map((line, index) => {
    try {
      return routerCorpusRowSchema.parse(JSON.parse(line));
    } catch (err) {
      throw new Error(`Invalid corpus row ${index + 1}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

if (validateOnly) {
  const sourceCounts = rows.reduce((counts, row) => {
    counts[row.source] = (counts[row.source] ?? 0) + 1;
    return counts;
  }, {});
  console.log(JSON.stringify({ valid: true, corpusPath, corpusRows: rows.length, sourceCounts }, null, 2));
  process.exit(0);
}

const predictions = new Map();
const failures = [];
const latencies = [];
for (const row of rows) {
  try {
    const result = await classifyAssistantIntent(row.message, 1_500);
    predictions.set(row.id, result.classification);
    latencies.push(result.latencyMs);
  } catch (err) {
    failures.push({ id: row.id, category: err?.aiFailureCategory || err?.name || 'provider' });
  }
}

const sortedLatencies = [...latencies].sort((left, right) => left - right);
const percentile = (fraction) =>
  sortedLatencies.length ? sortedLatencies[Math.min(sortedLatencies.length - 1, Math.floor(sortedLatencies.length * fraction))] : null;
const evaluation = evaluateNestedFolds(rows, predictions);
const sourceCounts = rows.reduce((counts, row) => {
  counts[row.source] = (counts[row.source] ?? 0) + 1;
  return counts;
}, {});

console.log(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      corpusPath,
      corpusRows: rows.length,
      sourceCounts,
      routerVersion: ASSISTANT_ROUTER_VERSION,
      model: ASSISTANT_ROUTER_MODEL,
      configuration: { temperature: 0, maxAttempts: 1, timeoutMs: 1_500, foldSeed: 'stable-id-order-v1' },
      confusionMatrix: buildConfusionMatrix(rows, predictions),
      nestedEvaluation: evaluation,
      failures,
      latencyMs: { p50: percentile(0.5), p95: percentile(0.95) },
      modelCost: null,
      enablementNote:
        'Synthetic rows are development and safety fixtures only. A class remains ineligible until it has at least 50 real_sanitized direct-response examples and passes every precision and safety gate.',
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exitCode = 1;

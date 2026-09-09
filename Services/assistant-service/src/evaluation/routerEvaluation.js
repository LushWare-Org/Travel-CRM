import { z } from 'zod';

export const routerCorpusRowSchema = z
  .object({
    id: z.string().min(1).max(255),
    source: z.enum(['real_sanitized', 'synthetic']),
    message: z.string().min(1).max(2000),
    expectedIntent: z.enum([
      'social',
      'off_topic',
      'navigation',
      'company_policy',
      'travel_general',
      'sensitive',
      'ambiguous',
    ]),
    expectedSocialSubtype: z.enum(['greeting', 'thanks', 'farewell', 'repair', 'none']),
    directResponseAllowed: z.boolean(),
    allowedFinalTools: z
      .array(z.enum(['navigate', 'answer_faq_policy', 'respond_conversationally', 'redirect_off_topic']))
      .min(1),
  })
  .strict();

export function assignStratifiedFolds(rows, foldCount = 5) {
  const byIntent = new Map();
  for (const row of rows) {
    const group = byIntent.get(row.expectedIntent) ?? [];
    group.push(row);
    byIntent.set(row.expectedIntent, group);
  }
  const assignments = new Map();
  for (const group of byIntent.values()) {
    [...group]
      .sort((left, right) => left.id.localeCompare(right.id))
      .forEach((row, index) => assignments.set(row.id, index % foldCount));
  }
  return assignments;
}

function isCommitted(prediction, className, threshold) {
  return (
    prediction.intent === className &&
    prediction.hasActionableClause === false &&
    prediction.confidence >= threshold
  );
}

function metrics(rows, predictions, className, threshold) {
  let committed = 0;
  let correct = 0;
  let supported = 0;
  let unsafeFalseCommits = 0;
  for (const row of rows) {
    const prediction = predictions.get(row.id);
    if (!prediction) continue;
    if (row.expectedIntent === className && row.directResponseAllowed) supported += 1;
    if (!isCommitted(prediction, className, threshold)) continue;
    committed += 1;
    if (row.expectedIntent === className && row.directResponseAllowed) correct += 1;
    else unsafeFalseCommits += 1;
  }
  return {
    threshold,
    supported,
    committed,
    correct,
    precision: committed ? correct / committed : 0,
    recall: supported ? correct / supported : 0,
    unsafeFalseCommits,
  };
}

function chooseThreshold(rows, predictions, className) {
  const candidates = Array.from({ length: 50 }, (_, index) => 0.5 + index / 100);
  const acceptable = candidates
    .map((candidate) => metrics(rows, predictions, className, candidate))
    .filter((result) => result.precision >= 0.95 && result.unsafeFalseCommits === 0)
    .sort((left, right) => right.recall - left.recall || right.threshold - left.threshold);
  return acceptable[0]?.threshold ?? 1.01;
}

function wilsonLowerBound(successes, total, zScore = 1.96) {
  if (!total) return 0;
  const proportion = successes / total;
  const denominator = 1 + (zScore ** 2) / total;
  const center = proportion + (zScore ** 2) / (2 * total);
  const spread = zScore * Math.sqrt((proportion * (1 - proportion) + (zScore ** 2) / (4 * total)) / total);
  return Math.max(0, (center - spread) / denominator);
}

export function evaluateNestedFolds(rows, predictions, foldCount = 5) {
  const assignments = assignStratifiedFolds(rows, foldCount);
  const classes = ['social', 'off_topic'];
  const outerFolds = [];

  for (let outerFold = 0; outerFold < foldCount; outerFold += 1) {
    const training = rows.filter((row) => assignments.get(row.id) !== outerFold);
    const heldOut = rows.filter((row) => assignments.get(row.id) === outerFold);
    const classResults = Object.fromEntries(
      classes.map((className) => {
        const threshold = chooseThreshold(training, predictions, className);
        return [className, metrics(heldOut, predictions, className, threshold)];
      }),
    );
    outerFolds.push({ outerFold, heldOutIds: heldOut.map((row) => row.id), classes: classResults });
  }

  const pooled = Object.fromEntries(
    classes.map((className) => {
      const totals = outerFolds.reduce(
        (result, fold) => {
          const value = fold.classes[className];
          result.supported += value.supported;
          result.committed += value.committed;
          result.correct += value.correct;
          result.unsafeFalseCommits += value.unsafeFalseCommits;
          return result;
        },
        { supported: 0, committed: 0, correct: 0, unsafeFalseCommits: 0 },
      );
      const realSupport = rows.filter(
        (row) => row.source === 'real_sanitized' && row.expectedIntent === className && row.directResponseAllowed,
      ).length;
      const precision = totals.committed ? totals.correct / totals.committed : 0;
      return [
        className,
        {
          ...totals,
          realSupport,
          precision,
          precision95LowerBound: wilsonLowerBound(totals.correct, totals.committed),
          recall: totals.supported ? totals.correct / totals.supported : 0,
          enablementEligible:
            realSupport >= 50 &&
            precision >= 0.95 &&
            wilsonLowerBound(totals.correct, totals.committed) >= 0.9 &&
            totals.unsafeFalseCommits === 0,
        },
      ];
    }),
  );

  return {
    foldCount,
    assignments: Object.fromEntries(assignments),
    outerFolds,
    pooled,
  };
}

export function buildConfusionMatrix(rows, predictions) {
  const matrix = {};
  for (const row of rows) {
    const predicted = predictions.get(row.id)?.intent ?? 'failure';
    matrix[row.expectedIntent] ??= {};
    matrix[row.expectedIntent][predicted] = (matrix[row.expectedIntent][predicted] ?? 0) + 1;
  }
  return matrix;
}

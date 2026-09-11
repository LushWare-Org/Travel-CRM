// ─── Leads page adapter — record mode OR collection mode ───────────────────
// `/leads` is the one page with two genuinely different scopes:
//
//   { leadId }  → the briefing for one lead (the shipped record path)
//   {}          → the collection analyst, which is what the page shows when
//                 nothing is selected
//
// This composes the two rather than teaching either about the other: the record
// path is the original hand-written adapter and is left exactly as it was, and
// the collection path is a descriptor over the shared engine. The registry wants
// one adapter per page key, so this is that one entry.
//
// The scope union is strict on BOTH branches on purpose. `{ leadId: '' }` and
// any unknown filter match neither, so malformed input still rejects with a 400
// before any fetch — which is the behaviour the page relied on before collection
// mode existed.

import { z } from 'zod';
import AppError from '../../utils/appError.js';
import { BAD_REQUEST } from '../../constants/httpStatus.js';
import { leadsAdapter } from '../leads.adapter.js';
import { leadsCollectionAdapter } from './leadsCollection.adapter.js';

const leadsPageScopeSchema = z.union([
  z.object({ leadId: z.string().trim().min(1).max(255) }).strict(),
  z.object({}).strict(),
]);

const isRecordScope = (scope) => typeof scope?.leadId === 'string' && scope.leadId.trim().length > 0;

export const leadsPageAdapter = {
  key: 'leads',

  parseScope(input) {
    const result = leadsPageScopeSchema.safeParse(input ?? {});
    if (!result.success) {
      throw new AppError(
        `Invalid leads scope: ${result.error.issues.map((i) => i.message).join('; ')}`,
        BAD_REQUEST,
      );
    }
    return result.data;
  },

  // The ask vocabulary is resolved per SCOPE, from the same `isRecordScope`
  // discriminator `loadEvidence` uses above — never from `page.key`. A key-based
  // lookup cannot tell the two `/leads` scopes apart: it would either leave
  // `getLead` live on the collection scope (the exact defect this seam exists to
  // remove) or, because this adapter is hand-written and has no `descriptor`,
  // resolve to no tools at all and silently force every `/leads` ask
  // single-shot.
  askTools(scope) {
    return isRecordScope(scope)
      ? leadsAdapter.askTools(scope)
      : leadsCollectionAdapter.askTools(scope);
  },

  loadEvidence(ctx, scope, options) {
    return isRecordScope(scope)
      ? leadsAdapter.loadEvidence(ctx, scope, options)
      : leadsCollectionAdapter.loadEvidence(ctx, scope, options);
  },

  computeInsights(bundle, since) {
    // Discriminated on the bundle's own SHAPE, not on `bundle.record`. A
    // collection bundle always carries a `records` array; the record bundle
    // never does. Testing `bundle.record` was wrong: when the lead fetch fails,
    // `record` is null on a record-scope bundle, which routed a failed record
    // into the collection path.
    const isCollection = Array.isArray(bundle.records);
    return isCollection
      ? leadsCollectionAdapter.computeInsights(bundle, since)
      : leadsAdapter.computeInsights(bundle, since);
  },

  defaultQuestions(bundle) {
    return Array.isArray(bundle.records)
      ? leadsCollectionAdapter.defaultQuestions(bundle)
      : leadsAdapter.defaultQuestions(bundle);
  },
};

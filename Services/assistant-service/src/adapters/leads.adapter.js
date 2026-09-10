// ─── Leads page adapter (reference implementation) ────────────────────────
// Demonstrates the adapter pattern for the richest cold-start page. Fetching
// is defensive: a 403/404 from lead-service is propagated into
// `notAuthorizedSources` (never pre-checked, because the unclaimed
// PENDING_VERIFICATION queue is openable by any salesRep), a 5xx/timeout into
// `unavailableSources`, and a 200 into one bounded evidence item per
// allowlisted field.
//
// Evidence granularity: every allowlisted field becomes its own CITATION-ONLY
// item with a scalar `value` and `fieldPaths: [field]`, identified by the
// shared `leadEvidenceId` producer. Field items are never the record store:
// the fetched record is held on `bundle.record` (outside `evidence`), and
// `computeInsights` / `defaultQuestions` read that — a scalar `value` must
// never be dereferenced as an object.
//
// Field allowlist + related billing/flight/communication reads are finalized
// in the T7 endpoint audit; this reference covers the lead record itself.

import { z } from 'zod';
import { LEAD_COPILOT_FIELDS, leadEvidenceId } from '@travel-crm/contracts';
import AppError from '../utils/appError.js';
import { domainAuthHeader } from '../utils/cloudRunAuth.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';

const LEAD_SERVICE_URL = process.env.LEAD_SERVICE_URL || 'http://localhost:3004';

const leadScopeSchema = z
  .object({
    leadId: z.string().trim().min(1).max(255),
  })
  .strict();

// The allowlisted scalar fields we forward into evidence. Everything else on
// the lead record is excluded before the model sees it (data minimization).
function allowlistLead(lead) {
  return {
    id: lead?.id ?? null,
    lifecycleStatus: lead?.lifecycleStatus ?? null,
    assignedToId: lead?.assignedToId ?? null,
    name: lead?.name ?? null,
    destination: lead?.destination ?? null,
    budget: lead?.budget ?? null,
    createdAt: lead?.createdAt ?? null,
    updatedAt: lead?.updatedAt ?? null,
  };
}

async function fetchLead(ctx, leadId, bundle) {
  let res;
  try {
    // Platform auth (Cloud Run run.invoker) on top of the forwarded actor
    // headers — see cloudRunAuth.js. A minting failure is a source failure.
    const auth = await domainAuthHeader(LEAD_SERVICE_URL);
    res = await fetch(`${LEAD_SERVICE_URL}/api/v1/leads/${leadId}`, {
      headers: { ...ctx.headers, 'content-type': 'application/json', ...auth },
    });
  } catch {
    bundle.unavailableSources.push('leads');
    return null;
  }
  if (res.status === 403 || res.status === 404) {
    bundle.notAuthorizedSources.push('leads');
    return null;
  }
  if (!res.ok) {
    bundle.unavailableSources.push('leads');
    return null;
  }
  const json = await res.json();
  return json?.data ?? null;
}

function daysBetween(iso, now) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((now - then) / 86_400_000);
}

export const leadsAdapter = {
  key: 'leads',

  parseScope(input) {
    const result = leadScopeSchema.safeParse(input ?? {});
    if (!result.success) {
      throw new AppError(`Invalid leads scope: ${result.error.issues.map((i) => i.message).join('; ')}`, BAD_REQUEST);
    }
    return result.data;
  },

  async loadEvidence(ctx, scope) {
    const asOf = new Date().toISOString();
    const bundle = {
      context: { pageKey: 'leads', scopeLabel: `Lead ${scope.leadId}`, actorRole: ctx.user.role, asOf },
      record: null,
      evidence: [],
      deterministicInsights: [],
      unavailableSources: [],
      notAuthorizedSources: [],
    };

    const fetched = await fetchLead(ctx, scope.leadId, bundle);
    const record = fetched ? allowlistLead(fetched) : null;
    bundle.record = record?.id ? record : null;

    if (bundle.record) {
      for (const field of LEAD_COPILOT_FIELDS) {
        const value = bundle.record[field];
        if (value === null || value === undefined) continue;
        bundle.evidence.push({
          id: leadEvidenceId(bundle.record.id, field),
          type: 'record',
          label: `Lead ${bundle.record.id} · ${field}`,
          value,
          recordRef: { kind: 'lead', id: bundle.record.id },
          fieldPaths: [field],
          updatedAt: bundle.record.updatedAt ?? bundle.record.createdAt ?? asOf,
          asOf,
        });
      }
    }

    return bundle;
  },

  computeInsights(bundle, since) {
    const lead = bundle.record;
    if (!lead) return [];

    const now = Date.now();
    const boundaryMs = since instanceof Date ? since.getTime() : since ? new Date(since).getTime() : NaN;
    const daysSinceUpdate = daysBetween(lead.updatedAt, now);
    const daysSinceCreated = daysBetween(lead.createdAt, now);

    const statusId = leadEvidenceId(lead.id, 'lifecycleStatus');
    const updatedAtId = leadEvidenceId(lead.id, 'updatedAt');
    const createdAtId = leadEvidenceId(lead.id, 'createdAt');
    const hasEvidence = (id) => bundle.evidence.some((item) => item.id === id);

    const insights = [];

    if (hasEvidence(statusId)) {
      insights.push({
        id: 'lead-status',
        section: 'current_state',
        severity: 'info',
        text: `Lead is in ${lead.lifecycleStatus} status.`,
        evidenceIds: [statusId],
      });
    }

    // Boundary-relative: "changed since the agent last saw this", never
    // now-relative freshness. The 7-day warnings below stay now-relative
    // staleness and live in `attention`, so every `changed` claim is bounded
    // by the resolved window.
    const updatedMs = lead.updatedAt ? new Date(lead.updatedAt).getTime() : NaN;
    if (hasEvidence(updatedAtId) && !Number.isNaN(boundaryMs) && !Number.isNaN(updatedMs) && updatedMs >= boundaryMs) {
      insights.push({
        id: 'lead-changed',
        section: 'changed',
        severity: 'info',
        text: 'This lead record changed since you last saw it.',
        fact: { kind: 'date', value: lead.updatedAt, evidenceId: updatedAtId },
        evidenceIds: [updatedAtId],
      });
    }

    if (hasEvidence(updatedAtId) && daysSinceUpdate != null) {
      insights.push({
        id: 'lead-freshness',
        section: 'attention',
        severity: daysSinceUpdate >= 7 ? 'warning' : 'info',
        text: `Lead record last updated ${daysSinceUpdate} day(s) ago.`,
        fact: { kind: 'date', value: lead.updatedAt, evidenceId: updatedAtId },
        evidenceIds: [updatedAtId],
      });
    }

    if (hasEvidence(statusId) && lead.lifecycleStatus === 'PENDING_VERIFICATION') {
      insights.push({
        id: 'lead-unclaimed',
        section: 'attention',
        severity: 'warning',
        text: 'Lead is unclaimed and pending verification — claim it to move it out of the shared queue.',
        evidenceIds: [statusId],
      });
    }

    if (
      hasEvidence(createdAtId) &&
      daysSinceCreated != null &&
      daysSinceCreated >= 7 &&
      lead.lifecycleStatus !== 'PENDING_VERIFICATION'
    ) {
      insights.push({
        id: 'lead-stale',
        section: 'attention',
        severity: 'warning',
        text: 'Lead has been open for more than 7 days without resolution.',
        fact: { kind: 'date', value: lead.createdAt, evidenceId: createdAtId },
        evidenceIds: [createdAtId],
      });
    }

    return insights;
  },

  defaultQuestions(bundle) {
    const lead = bundle.record;
    if (!lead) return [];
    const q = [
      `Why is this lead in ${lead.lifecycleStatus ?? 'its current'} status?`,
      'What should I do next with this lead?',
      'Compare this lead with similar converted leads.',
    ];
    return q.slice(0, 3);
  },
};

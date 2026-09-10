// ─── Leads page adapter (reference implementation) ────────────────────────
// Demonstrates the adapter pattern for the richest cold-start page. Fetching
// is defensive: a 403/404 from lead-service is propagated into
// `notAuthorizedSources` (never pre-checked, because the unclaimed
// PENDING_VERIFICATION queue is openable by any salesRep), a 5xx/timeout into
// `unavailableSources`, and a 200 into bounded evidence items.
//
// Field allowlist + related billing/flight/communication reads are finalized
// in the T7 endpoint audit; this reference covers the lead record itself.

import { z } from 'zod';
import AppError from '../utils/appError.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';

const LEAD_SERVICE_URL = process.env.LEAD_SERVICE_URL || 'http://localhost:3004';

const leadScopeSchema = z
  .object({
    leadId: z.string().min(1).max(255),
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
    res = await fetch(`${LEAD_SERVICE_URL}/api/v1/leads/${leadId}`, {
      headers: { ...ctx.headers, 'content-type': 'application/json' },
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
      evidence: [],
      deterministicInsights: [],
      unavailableSources: [],
      notAuthorizedSources: [],
    };

    const lead = await fetchLead(ctx, scope.leadId, bundle);
    if (lead) {
      bundle.evidence.push({
        id: `lead:${lead.id}`,
        type: 'record',
        label: `Lead ${lead.id}`,
        value: allowlistLead(lead),
        recordRef: { kind: 'lead', id: lead.id },
        updatedAt: lead.updatedAt ?? lead.createdAt ?? asOf,
        asOf,
      });
    }

    return bundle;
  },

  computeInsights(bundle, since) {
    const leadItem = bundle.evidence.find((e) => e.type === 'record' && e.id.startsWith('lead:'));
    if (!leadItem) return [];

    const now = Date.now();
    const lead = leadItem.value;
    const daysSinceUpdate = daysBetween(lead.updatedAt, now);
    const daysSinceCreated = daysBetween(lead.createdAt, now);

    const insights = [
      {
        id: 'lead-status',
        section: 'current_state',
        severity: 'info',
        text: `Lead is in ${lead.lifecycleStatus ?? 'unknown'} status.`,
        evidenceIds: [leadItem.id],
      },
    ];

    if (daysSinceUpdate != null) {
      insights.push({
        id: 'lead-freshness',
        section: 'changed',
        severity: daysSinceUpdate >= 7 ? 'warning' : 'info',
        text: `Lead record last updated ${daysSinceUpdate} day(s) ago.`,
        fact: { kind: 'duration', value: `${daysSinceUpdate} days`, evidenceId: leadItem.id },
        evidenceIds: [leadItem.id],
      });
    }

    if (lead.lifecycleStatus === 'PENDING_VERIFICATION') {
      insights.push({
        id: 'lead-unclaimed',
        section: 'attention',
        severity: 'warning',
        text: 'Lead is unclaimed and pending verification — claim it to move it out of the shared queue.',
        evidenceIds: [leadItem.id],
      });
    }

    if (daysSinceCreated != null && daysSinceCreated >= 7 && lead.lifecycleStatus !== 'PENDING_VERIFICATION') {
      insights.push({
        id: 'lead-stale',
        section: 'attention',
        severity: 'warning',
        text: 'Lead has been open for more than 7 days without resolution.',
        evidenceIds: [leadItem.id],
      });
    }

    return insights;
  },

  defaultQuestions(bundle) {
    const leadItem = bundle.evidence.find((e) => e.id.startsWith('lead:'));
    if (!leadItem) return [];
    const lead = leadItem.value;
    const q = [
      `Why is this lead in ${lead.lifecycleStatus ?? 'its current'} status?`,
      'What should I do next with this lead?',
      'Compare this lead with similar converted leads.',
    ];
    return q.slice(0, 3);
  },
};

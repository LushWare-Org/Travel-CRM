import { z } from 'zod';
import { domainAuthHeader } from '../utils/cloudRunAuth.js';

// ─── Domain tool registry ─────────────────────────────────────────────────
// The model selects from this fixed, allowlisted tool vocabulary; the server
// executes each tool under the caller's forwarded x-user-* identity and
// returns bounded, allowlisted results. The model never receives database
// credentials, raw SQL, or arbitrary URLs — only these named tools.

const LEAD_SERVICE_URL = process.env.LEAD_SERVICE_URL || 'http://localhost:3004';

// Bounded, allowlisted subset of a lead record — the same field allowlist as
// the leads adapter, so a model-invoked getLead cannot widen what the page
// briefing already exposes.
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

async function fetchJson(url, ctx) {
  const auth = await domainAuthHeader(LEAD_SERVICE_URL);
  const res = await fetch(url, { headers: { ...ctx.headers, 'content-type': 'application/json', ...auth } });
  if (res.status === 403 || res.status === 404) {
    return { notAuthorized: true };
  }
  if (!res.ok) {
    return { unavailable: true };
  }
  const json = await res.json();
  return { data: json?.data ?? null };
}

// Reference tools. The remaining tools (getLeadActivity, getMatchingPackages,
// getSalesMetrics, getSimilarConvertedLeads, searchManagementKnowledge) map to
// their domain endpoints in the T7 endpoint audit; each follows the same
// shape and security posture (allowlisted fields, bounded results, caller
// identity, 403/404 → notAuthorized).

export const domainTools = [
  {
    name: 'getLead',
    description: 'Fetch the current lead record (id, status, assignment, name, destination, budget).',
    argsSchema: z.object({ leadId: z.string().min(1).max(255) }),
    async execute(ctx, args) {
      const result = await fetchJson(`${LEAD_SERVICE_URL}/api/v1/leads/${args.leadId}`, ctx);
      if (result.notAuthorized) return { notAuthorized: true };
      if (result.unavailable) return { unavailable: true };
      return { data: allowlistLead(result.data) };
    },
  },
];

const toolsByName = new Map(domainTools.map((t) => [t.name, t]));

export function getTool(name) {
  return toolsByName.get(name);
}

export function toolNames() {
  return [...toolsByName.keys()];
}

// Executes a model-requested tool. Returns a bounded result object; a malformed
// tool or args returns a named error so the loop can feed it back to the model.
export async function executeTool(name, rawArgs, ctx) {
  const tool = getTool(name);
  if (!tool) return { error: `unknown tool '${name}'` };
  const parsed = tool.argsSchema.safeParse(rawArgs ?? {});
  if (!parsed.success) return { error: `invalid args for ${name}: ${parsed.error.issues.map((i) => i.message).join('; ')}` };
  try {
    return await tool.execute(ctx, parsed.data);
  } catch {
    return { unavailable: true };
  }
}

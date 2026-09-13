import { AssistantAction } from '@travel-crm/contracts';
import type {
  AssistantFormFieldState,
  AssistantPageAction,
  AssistantPageRegistration,
} from '../capabilities/AssistantCapabilityProvider';

/** The transcript lines this runner can produce for a turn it did not execute. */
export const NO_PAGE_ANNOUNCEMENT =
  'I can only change the trip on the trip planner and the customize pages — open one and ask me there.';
export const STALE_PAGE_ANNOUNCEMENT = 'The page changed, so I did not touch it — ask me again.';
export const FAILED_ACTION_ANNOUNCEMENT = 'That did not go through — say it again and I will retry.';

const fieldLabel = (name: string): string => name.replace(/([A-Z])/g, ' $1').trim().toLowerCase();

const nameList = (names: string[]): string =>
  names.length === 1
    ? fieldLabel(names[0])
    : `${names.slice(0, -1).map(fieldLabel).join(', ')} and ${fieldLabel(names[names.length - 1])}`;

/**
 * What the transcript says about a fill. Two clauses at most, because the two
 * things a visitor needs to know are which fields took their details and which
 * ones are waiting on their answer — and a fill that only hit a collision has
 * written nothing, so it must not read as done.
 */
export function describePrefill(applied: string[], held: string[]): string {
  const clauses: string[] = [];
  if (applied.length) clauses.push(`Filled in ${nameList(applied)}.`);
  if (held.length) clauses.push(`${nameList(held)} already has your own text — replace it?`);
  return clauses.join(' ');
}

/** A fill waiting on the visitor's answer, held client-side rather than sent back as a turn. */
export interface PendingPrefill {
  form: string;
  fields: Record<string, string | number>;
}

/**
 * Whether the visitor's own text stands in the way of a write. An assistant's own
 * earlier value is not a collision (a correction must land), and neither is an
 * empty field — so the only thing that can hold a write is text the visitor typed.
 */
function blockedByVisitorText(existing: AssistantFormFieldState | undefined, value: string | number): boolean {
  if (!existing || existing.source !== 'visitor') return false;
  return `${existing.value}`.trim() !== '' && `${existing.value}` !== `${value}`;
}

export interface RunActionResult {
  /** What to say under the reply. '' when the action is silent (moving the page needs no narration). */
  announcement: string;
  executed: boolean;
  reason?: 'no_page' | 'stale_revision' | 'unoffered' | 'invalid' | 'failed';
  /** Fields the fill could not write because the visitor's own text is there. */
  pending?: PendingPrefill;
}

/**
 * Validates and executes one page action the server returned.
 *
 * The model never authors an executed action: the server has already narrowed
 * the reply to this turn's offered set and re-shaped the arguments, and this is
 * the second, independent check the design asks for — the page's own manifest is
 * the permission boundary, the contract is the shape, and only then does the
 * page run anything. Everything that fails a check returns a sentence for the
 * transcript instead of throwing, because a refused action is an ordinary turn
 * outcome, not an error.
 */
export async function runAssistantAction({
  registration,
  tool,
  args,
  revision,
}: {
  registration: AssistantPageRegistration | null;
  tool: string;
  args: Record<string, unknown>;
  revision: string | null;
}): Promise<RunActionResult> {
  if (!registration) {
    return { executed: false, reason: 'no_page', announcement: NO_PAGE_ANNOUNCEMENT };
  }
  if (revision !== registration.revision) {
    return { executed: false, reason: 'stale_revision', announcement: STALE_PAGE_ANNOUNCEMENT };
  }
  if (!registration.actions.includes(tool as AssistantPageAction)) {
    return { executed: false, reason: 'unoffered', announcement: FAILED_ACTION_ANNOUNCEMENT };
  }

  const parsed = AssistantAction.safeParse({ tool, ...args });
  if (!parsed.success) {
    return { executed: false, reason: 'invalid', announcement: FAILED_ACTION_ANNOUNCEMENT };
  }

  // A form fill is not the page's `runAction`: what may be written is decided here,
  // against the live form, and the outcome is two lists rather than a line — what
  // was written, and what is waiting on the visitor.
  if (parsed.data.tool === 'prefill_form') {
    const prefill = registration.prefill;
    if (!prefill || prefill.form !== parsed.data.form) {
      return { executed: false, reason: 'unoffered', announcement: FAILED_ACTION_ANNOUNCEMENT };
    }

    const current = prefill.fields();
    const write: Record<string, string | number> = {};
    const held: Record<string, string | number> = {};
    for (const [field, value] of Object.entries(parsed.data.fields)) {
      if (blockedByVisitorText(current[field], value)) held[field] = value;
      else write[field] = value;
    }

    try {
      if (Object.keys(write).length) prefill.write(write);
    } catch {
      return { executed: false, reason: 'failed', announcement: FAILED_ACTION_ANNOUNCEMENT };
    }

    const written = Object.keys(write);
    const heldFields = Object.keys(held);
    return {
      executed: written.length > 0,
      announcement: describePrefill(written, heldFields),
      ...(heldFields.length ? { pending: { form: prefill.form, fields: held } } : {}),
    };
  }

  // A page with no `runAction` registered nothing this turn but a form: an action
  // it did not declare must not reach a page that cannot run it.
  if (!registration.runAction) {
    return { executed: false, reason: 'unoffered', announcement: FAILED_ACTION_ANNOUNCEMENT };
  }

  try {
    const announcement = await registration.runAction(parsed.data);
    return { executed: true, announcement: typeof announcement === 'string' ? announcement : '' };
  } catch {
    return { executed: false, reason: 'failed', announcement: FAILED_ACTION_ANNOUNCEMENT };
  }
}

/**
 * Applies a held fill once the visitor says so. Client-side by design: the confirm
 * is a control in the bubble, not another turn, and discarding writes nothing.
 */
export function resolveHeldPrefill({
  registration,
  pending,
  choice,
}: {
  registration: AssistantPageRegistration | null;
  pending: PendingPrefill;
  choice: 'replace' | 'keep';
}): RunActionResult {
  const prefill = registration?.prefill;
  if (!prefill || prefill.form !== pending.form) {
    return { executed: false, reason: 'stale_revision', announcement: STALE_PAGE_ANNOUNCEMENT };
  }
  if (choice === 'keep') {
    return { executed: false, announcement: 'Kept your text — I did not touch those fields.' };
  }
  try {
    prefill.write(pending.fields);
  } catch {
    return { executed: false, reason: 'failed', announcement: FAILED_ACTION_ANNOUNCEMENT };
  }
  return { executed: true, announcement: `Replaced it with ${nameList(Object.keys(pending.fields))}.` };
}

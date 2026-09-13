import { AssistantAction } from '@travel-crm/contracts';
import type { AssistantPageAction, AssistantPageRegistration } from '../capabilities/AssistantCapabilityProvider';

/** The transcript lines this runner can produce for a turn it did not execute. */
export const NO_PAGE_ANNOUNCEMENT =
  'I can only change the trip on the trip planner and the customize pages — open one and ask me there.';
export const STALE_PAGE_ANNOUNCEMENT = 'The page changed, so I did not touch it — ask me again.';
export const FAILED_ACTION_ANNOUNCEMENT = 'That did not go through — say it again and I will retry.';

export interface RunActionResult {
  /** What to say under the reply. '' when the action is silent (moving the page needs no narration). */
  announcement: string;
  executed: boolean;
  reason?: 'no_page' | 'stale_revision' | 'unoffered' | 'invalid' | 'failed';
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

  try {
    const announcement = await registration.runAction(parsed.data);
    return { executed: true, announcement: typeof announcement === 'string' ? announcement : '' };
  } catch {
    return { executed: false, reason: 'failed', announcement: FAILED_ACTION_ANNOUNCEMENT };
  }
}

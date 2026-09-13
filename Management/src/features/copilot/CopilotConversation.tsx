import { useEffect, useRef, useState } from "react";
import { Loader2, Send, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import ClaimItem from "./ClaimItem";
import { LiveStatus, useAnnouncer } from "./Announcer";
import { SuggestedQuestions } from "./insightShared";
import type { CopilotSession, PriorClaimContext } from "./types";

/** The composer's id, so an attachment can put the cursor in it. */
const COMPOSER_ID = "copilot-composer-input";

/** Focus targets for the clear control, so the confirm is keyboard-reachable. */
const CLEAR_TRIGGER_ID = "copilot-clear-trigger";
const CLEAR_CONFIRM_ID = "copilot-clear-confirm";

/**
 * The finding a turn is about, quoted above the question.
 *
 * Two tones, because it renders against two different surfaces - and each tone is
 * an inset relative to ITS OWN surface, not a shared fill. Inside the operator's
 * bubble that is `bg-accent-foreground/20`; above the composer, on `bg-card`, it is
 * `bg-foreground/15`.
 *
 * The standalone tone is NOT `bg-muted`. Muted sits 1.14:1 from `bg-card` in light
 * and 1.087:1 in dark, so on an empty chat the attachment rendered as loose text
 * with no box at all - worst in dark, which is where it was reported. Those ratios
 * are what "make it a visible box" means here; check them, not the eye, before
 * swapping this token for another.
 *
 * Both tones are a fill with no border at all, which is what keeps them clear of
 * the boundary rule ("hairlines only; no nested outlined containers") - a box is a
 * surface, not an outline.
 *
 * The label names the thing as an object ("Finding referenced"). It was previously
 * "You asked about", which is first-person: sitting inside the operator's own
 * bubble it read as though the quote were their own typed words, which is exactly
 * the confusion the box exists to remove. Never phrase this label from the
 * operator's point of view.
 *
 * Clamped to three lines on purpose: a long finding would otherwise push the
 * operator's own question below the fold in a 360px column, which inverts which
 * line they actually need to read.
 */
function QuotedContext({
  context,
  onAccent = false,
  onDetach,
}: {
  context: PriorClaimContext;
  onAccent?: boolean;
  /** Present only above the composer: a submitted turn's reference is a record. */
  onDetach?: () => void;
}) {
  return (
    <div
      data-copilot-quote={onAccent ? "in-bubble" : "above-composer"}
      className={cn(
        "w-full space-y-0.5",
        onAccent
          ? "rounded-sm bg-accent-foreground/20 px-2 py-1.5"
          : "rounded-md bg-foreground/15 px-2.5 py-2"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            onAccent ? "text-accent-foreground/70" : "text-muted-foreground"
          )}
        >
          Finding referenced
        </p>
        {/* Only above the composer. A submitted turn's reference is a record of
            what was asked, and its request already carried the finding. */}
        {onDetach && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Remove attached finding"
            onClick={onDetach}
          >
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
      <p className={cn("line-clamp-3 text-xs", onAccent ? "text-accent-foreground/80" : "text-foreground")}>
        {context.text}
      </p>
    </div>
  );
}

type CopilotConversationProps = {
  session: CopilotSession;
  scopeLabel: string;
};

/**
 * The shell's conversation — not the record panel's. It renders on every
 * page key, so nothing here may assume a lead is in scope: the pending copy is
 * derived from `scopeLabel`, never the record-specific "this lead".
 *
 * It is its own tab, inside its own `CopilotSurface`:
 *
 * -- CopilotTabs ------------------------------------------------+
 * |  [ Insights ][ Copilot ]   title bar, default variant, 40px  |
 * +--------------------------+-----------------------------------+
 * |  Insights panel          |  Copilot panel                    |
 * |  CopilotSurface (scroll) |  CopilotSurface (scroll)          |
 * |    children(api)         |    transcript, oldest first       |
 * |    record: header >      |      quoted context per turn      |
 * |      critical band >     |      > composer                   |
 * |      changed >           |        (sticky bottom-0 to THIS   |
 * |      current state >     |         scrollport, never         |
 * |      attention >         |         position: fixed)          |
 * |      experienced view >  |      suggested questions          |
 * |                          |        (empty transcript only)    |
 * +--------------------------+-----------------------------------+
 *
 * In the transcript, side and fill carry the speaker: right-aligned accent
 * bubbles are the operator, left and unboxed is the copilot.
 *
 * One scroller PER PANEL, not one for the whole surface. A single scroller
 * behind two panels cannot hold two scroll offsets, so switching tabs would
 * discard wherever the operator was reading — which is why the surface moved out
 * of `CopilotDock`/`CopilotDrawer` and into the panels. Both stay mounted
 * (`keepMounted`) so those offsets, and the composer's draft, survive a switch.
 *
 * There is no hairline between the insights and the conversation any more: they
 * are separate tabs, and a separator across a boundary that is no longer
 * adjacent would be decoration.
 *
 * The composer's `-mx-4 px-4` cancels this surface's `px-4` so its `bg-card`
 * spans the full scroll width and scrolling text cannot show beside it; its
 * `sticky bottom-0` is scoped to this scrollport and to nothing else, and keeps
 * the bar reachable once the transcript overflows.
 *
 * The root must NOT force a full panel height. `min-h-full` with an `mt-auto`
 * composer pins the bar to the panel's bottom edge, and the operator pays for it
 * with a blank band between the last answer and the bar whenever the transcript
 * is short — measured at 661px of a 768px panel under the old stacked layout, so
 * almost a full screen scrolled through for nothing. The composer follows the
 * transcript directly.
 *
 * State contract, both scope kinds (what the operator SEES):
 *
 * | Surface      | Loading                        | Empty                                    | Error                                | Success                       | Partial                       |
 * |--------------|--------------------------------|------------------------------------------|--------------------------------------|-------------------------------|-------------------------------|
 * | Insights     | skeletons, then deterministic  | "No verified insights…" / examined count | full error + Retry, no stale claims  | scope order + evidence actions| claims kept + partial + Retry |
 * | Conversation | pending copy on the submitted turn | no transcript region before the first question; suggested questions then composer | turn keeps its question, concise failure + Retry | paired user turn + grounded blocks | verified blocks, no invented text |
 * | Collection ask | same neutral pending copy, single-shot on a page declaring no tools | an empty list is still askable: composer enabled, transcript empty until asked | same per-turn error + Retry          | same paired turn shape        | same                          |
 * | Composer     | present but disabled until the deterministic phase is ready | present (empty is not no-access) | disabled                             | enabled                       | enabled                       |
 *
 * A bubble on the right for the operator, unboxed content on the left for the
 * copilot: who spoke is carried by side, fill and corner shape, never by a
 * visible label. Attribution survives as sr-only text so a screen reader still
 * hears it. The assistant's answers stay unboxed because `ClaimItem` is
 * documented as claim-row with no container, and its evidence actions sit inside
 * the claim text. A submitted or suggested question exists as a visible user turn
 * before its request starts, and the answer attaches to that turn (loading,
 * grounded blocks, or a concise failure with a retry). Every answer claim keeps
 * its evidence action inline. An
 * `answerBlocks: []` turn is a recoverable state, not a dead end: it keeps the
 * question and re-submits the same question through the per-turn retry path.
 * The one case with no retry is a scope the operator cannot read, where asking
 * again cannot help.
 */
export default function CopilotConversation({ session, scopeLabel }: CopilotConversationProps) {
  const [announcement, announce] = useAnnouncer();

  // Attaching a finding moves focus into the composer and says so once. The
  // click is an invitation to type, and the attachment is already on screen
  // above the input — so the focus move is the affordance, not an extra control.
  useEffect(() => {
    if (!session.pendingContext) return;
    document.getElementById(COMPOSER_ID)?.focus();
    announce("Finding attached. Ask your question about it.");
  }, [session.pendingContext, announce]);

  /**
   * A suggested question is SENT — exactly what typing it and pressing Enter
   * would do. The click is the send, so the operator skips the wording rather
   * than being handed a draft of it.
   *
   * No focus call: `submit` flips the composer to disabled for the turn, and a
   * browser blurs a disabled element, so any focus taken here is dropped again.
   * That is the same place typing and pressing Enter leaves focus.
   */
  const askSuggested = (question: string) => {
    session.submit(question);
  };

  const [confirmingClear, setConfirmingClear] = useState(false);
  const wasConfirmingClear = useRef(false);

  // Clearing drops the whole transcript, so it is a one-way door and never fires
  // on a single click. Escape dismisses from anywhere, and focus follows the
  // state: into the confirm control so a keyboard operator is not stranded, and
  // back to the trigger on dismiss so they are not dropped at the top of the
  // panel.
  useEffect(() => {
    if (!confirmingClear) {
      if (wasConfirmingClear.current) document.getElementById(CLEAR_TRIGGER_ID)?.focus();
      wasConfirmingClear.current = false;
      return undefined;
    }
    document.getElementById(CLEAR_CONFIRM_ID)?.focus();
    wasConfirmingClear.current = true;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmingClear(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmingClear]);

  const composerDisabled = session.asking || Boolean(session.error) || !session.canAsk;
  const showComposer = session.hasScope && !session.noAccess;
  const hasTurns = session.turns.length > 0;

  // Nothing to say and nothing to ask: contributing no hairline beats leaving a
  // separator over blank space (a no-access or no-scope panel).
  if (!hasTurns && !showComposer) return null;

  return (
    <div className="flex flex-col space-y-3">
      {/* One live region per surface, outside the transcript's own gate: an empty
          chat renders no conversation region, and an announcement that renders
          nowhere is an announcement nobody hears. */}
      <LiveStatus message={announcement} />
      {hasTurns && (
        <section aria-label="Conversation" className="space-y-6">
          {session.turns.map((turn) => (
            <div key={turn.id} className="space-y-3">
              {/*
                The operator speaks in a bubble on the right. `{rounded.xl}` is the
                top of the ordinary radius range (2xl is documented as rare), with
                the bottom-right corner dropped to `{rounded.sm}` for the tail -
                Messenger's cue for which side owns the message.

                This wrapper's gap is 12px against the section's 24px: the answer
                has to detach from the bubble without turns running together.
              */}
              <div data-copilot-turn="user" className="flex justify-end">
                <div className="max-w-[85%] space-y-1 rounded-xl rounded-br-sm bg-accent px-3 py-2">
                  <p className="sr-only">You said:</p>
                  {turn.context && <QuotedContext context={turn.context} onAccent />}
                  <p className="text-sm text-accent-foreground">{turn.question}</p>
                </div>
              </div>

              {/* Unboxed on the left: `claim-row` is documented with no container,
                  and its evidence actions sit inside the claim text. */}
              <div data-copilot-turn="assistant" className="space-y-2">
                <p className="sr-only">Copilot said:</p>

                {turn.status === "pending" && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Checking {scopeLabel}…
                  </p>
                )}

                {turn.status === "error" && (
                  <div className="space-y-1.5">
                    <p className="text-sm text-warning">{turn.error ?? "The copilot could not answer that"}</p>
                    <Button variant="outline" size="xs" onClick={() => session.retryTurn(turn.id)}>
                      Retry
                    </Button>
                  </div>
                )}

                {turn.status === "answered" &&
                  (turn.answer && turn.answer.length > 0 ? (
                    <div className="space-y-3">
                      {turn.answer.map((claim) => (
                        <ClaimItem
                          key={claim.id}
                          claim={claim}
                          sources={session.sources}
                          announce={announce}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-sm text-muted-foreground">No grounded answer for that question.</p>
                      {!session.noAccess && (
                        <Button variant="outline" size="xs" onClick={() => session.retryTurn(turn.id)}>
                          Try again
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {hasTurns && showComposer && (
        <div className="flex justify-end">
          {confirmingClear ? (
            <div
              role="group"
              aria-label="Confirm clearing the conversation"
              className="flex flex-wrap items-center justify-end gap-2"
            >
              {/* States exactly what is destroyed, so the confirm is informed. */}
              <p className="text-xs text-foreground">Clear this conversation? The findings stay.</p>
              <Button
                id={CLEAR_CONFIRM_ID}
                variant="destructive"
                size="xs"
                className="min-h-[44px]"
                onClick={() => {
                  session.clearConversation();
                  setConfirmingClear(false);
                }}
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="min-h-[44px]"
                onClick={() => setConfirmingClear(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              id={CLEAR_TRIGGER_ID}
              variant="ghost"
              size="xs"
              className="min-h-[44px] text-xs text-muted-foreground"
              onClick={() => setConfirmingClear(true)}
            >
              Clear conversation
            </Button>
          )}
        </div>
      )}

      {/*
        Only while the transcript is empty. The prompts are a way in, not a part of
        the conversation: once something has been asked the transcript is the thing
        to read, and they return when it is cleared — the only other empty state
        this panel has.
      */}
      {showComposer && !hasTurns && <SuggestedQuestions session={session} onAsk={askSuggested} />}

      {showComposer && (
        <form
          className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-border bg-card px-4 pt-3 pb-1"
          onSubmit={(event) => {
            event.preventDefault();
            session.submit();
          }}
        >
          {session.pendingContext && (
            <QuotedContext
              context={session.pendingContext}
              onDetach={() => {
                // Deliberately not an effect on `pendingContext === null`:
                // submitting clears it too, and that path must not steal focus or
                // claim the finding was removed.
                session.detachFinding();
                document.getElementById(COMPOSER_ID)?.focus();
                announce("Finding removed.");
              }}
            />
          )}
          <div className="flex items-end gap-2">
          <Textarea
            id={COMPOSER_ID}
            value={session.input}
            onChange={(event) => session.setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                session.submit();
              }
            }}
            rows={1}
            aria-label={`Ask about ${scopeLabel}`}
            placeholder={`Ask about ${scopeLabel}…`}
            disabled={composerDisabled}
            className="min-h-0 resize-none py-2 text-sm"
          />
          <Button
            type="submit"
            className="mb-px gap-1.5"
            disabled={composerDisabled || !session.input.trim()}
          >
            {session.asking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            Ask
          </Button>
          </div>
        </form>
      )}
    </div>
  );
}

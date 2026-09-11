import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ClaimItem from "./ClaimItem";
import { LiveStatus, useAnnouncer } from "./Announcer";
import type { CopilotSession } from "./types";

type CopilotConversationProps = {
  session: CopilotSession;
  scopeLabel: string;
};

/**
 * The shell's conversation — not the record briefing's. It renders on every
 * page key, so nothing here may assume a lead is in scope: the pending copy is
 * derived from `scopeLabel`, never the record-specific "this lead".
 *
 * It is the second child of `CopilotSurface`, after one `border-t` hairline:
 *
 * -- CopilotSurface (the panel's only scroller) -----------------+
 * |  briefing children(api)                                      |
 * |    record:     header > changed > current state >            |
 * |                attention > experienced view >                |
 * |                suggested questions                           |
 * |    collection: attention > changed > current state >         |
 * |                experienced view > suggested questions        |
 * |  ---- one hairline (border-t), no card, no tab ----          |
 * |  CopilotConversation: transcript, oldest first               |
 * |    > composer  (sticky bottom-0 to THIS scrollport,          |
 * |       never position: fixed)                                 |
 * +--------------------------------------------------------------+
 *
 * The composer's `-mx-4 px-4` cancels this surface's `px-4` so its `bg-card`
 * spans the full scroll width and scrolling text cannot show beside it; its
 * `sticky bottom-0` is scoped to this scrollport and to nothing else. The
 * conversation root is `flex min-h-full flex-col` with the composer
 * `mt-auto`, so an empty transcript still puts the bar on the panel's bottom
 * edge; `sticky bottom-0` keeps it there once the transcript overflows.
 *
 * State contract, both scope kinds (what the operator SEES):
 *
 * | Surface      | Loading                        | Empty                                    | Error                                | Success                       | Partial                       |
 * |--------------|--------------------------------|------------------------------------------|--------------------------------------|-------------------------------|-------------------------------|
 * | Briefing     | skeletons, then deterministic  | "No verified insights…" / examined count | full error + Retry, no stale claims  | scope order + evidence actions| claims kept + partial + Retry |
 * | Conversation | pending copy on the submitted turn | no transcript region before the first question; composer stays | turn keeps its question, concise failure + Retry | paired user turn + grounded blocks | verified blocks, no invented text |
 * | Collection ask | same neutral pending copy, single-shot on a page declaring no tools | an empty list is still askable: composer enabled, transcript empty until asked | same per-turn error + Retry          | same paired turn shape        | same                          |
 * | Composer     | present but disabled until the deterministic phase is ready | present (empty is not no-access) | disabled                             | enabled                       | enabled                       |
 *
 * A restrained transcript, not speech bubbles: a submitted or suggested
 * question exists as a visible user turn before its request starts, and the
 * answer attaches to that turn (loading, grounded blocks, or a concise failure
 * with a retry). Every answer claim keeps its evidence action inline. An
 * `answerBlocks: []` turn is a recoverable state, not a dead end: it keeps the
 * question and re-submits the same question through the per-turn retry path.
 * The one case with no retry is a scope the operator cannot read, where asking
 * again cannot help.
 */
export default function CopilotConversation({ session, scopeLabel }: CopilotConversationProps) {
  const [announcement, announce] = useAnnouncer();

  const composerDisabled = session.asking || Boolean(session.error) || !session.canAsk;
  const showComposer = session.hasScope && !session.noAccess;
  const hasTurns = session.turns.length > 0;

  // Nothing to say and nothing to ask: contributing no hairline beats leaving a
  // separator over blank space (a no-access or no-scope panel).
  if (!hasTurns && !showComposer) return null;

  return (
    <div className="mt-4 flex min-h-full flex-col space-y-3 border-t border-border pt-3">
      {hasTurns && (
        <section aria-label="Conversation" className="space-y-3">
          <LiveStatus message={announcement} />
          {session.turns.map((turn) => (
            <div key={turn.id} className="space-y-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">You</p>
                <p className="text-sm text-foreground">{turn.question}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Copilot</p>

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

      {showComposer && (
        <form
          className="sticky bottom-0 mt-auto -mx-4 flex items-end gap-2 border-t border-border bg-card px-4 pt-3 pb-1"
          onSubmit={(event) => {
            event.preventDefault();
            session.submit();
          }}
        >
          <Textarea
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
        </form>
      )}
    </div>
  );
}

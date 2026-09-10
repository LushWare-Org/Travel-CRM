import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ClaimItem from "./ClaimItem";
import { LiveStatus, useAnnouncer } from "./Announcer";
import type { CopilotSession } from "./types";

type LeadConversationProps = {
  session: CopilotSession;
  scopeLabel: string;
};

/**
 * A restrained transcript, not speech bubbles: a submitted or suggested
 * question exists as a visible user turn before its request starts, and the
 * answer attaches to that turn (loading, grounded blocks, or a concise failure
 * with Retry). Every answer claim keeps its evidence action inline.
 */
export default function LeadConversation({ session, scopeLabel }: LeadConversationProps) {
  const [announcement, announce] = useAnnouncer();

  const composerDisabled = session.asking || Boolean(session.error) || !session.canAsk;
  const showComposer = session.hasScope && !session.noAccess;

  return (
    <div className="space-y-3">
      {session.turns.length > 0 && (
        <section aria-label="Conversation" className="space-y-3">
          <LiveStatus message={announcement} />
          {session.turns.map((turn) => (
            <div key={turn.id} className="space-y-2 border-t border-border pt-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">You</p>
                <p className="text-sm text-foreground">{turn.question}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Copilot</p>

                {turn.status === "pending" && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Checking this lead…
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
                    <p className="text-sm text-muted-foreground">No grounded answer for that question.</p>
                  ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {showComposer && (
        <form
          className="sticky bottom-0 -mx-1 flex items-end gap-2 border-t border-border bg-card px-1 pt-3 pb-1"
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

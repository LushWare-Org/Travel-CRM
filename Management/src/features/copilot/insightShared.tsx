import { Button } from "@/components/ui/button";
import type { ClaimSection, CopilotClaim, CopilotSession } from "./types";

/**
 * The pieces both panels share, with exactly one definition each: the
 * severity ordering of the attention section, and the suggested-questions
 * block. `LeadInsights` and `CollectionInsights` import these.
 *
 * Deliberately NOT shared: each panel's section ORDER and heading TEXT. They
 * differ on purpose — a record is read with `changed` first ("Since you were
 * here"), a list is scanned with `attention` first ("Changed") — and one shared
 * order array would silently swap the record panel's shipped hierarchy.
 */
export function claimsIn(claims: CopilotClaim[], section: ClaimSection): CopilotClaim[] {
  if (section === "attention") {
    // Highest severity first: the attention job is the top of the panel.
    const rank = { critical: 0, warning: 1, info: 2 } as const;
    return claims
      .filter((claim) => claim.section === section)
      .sort((a, b) => rank[a.severity] - rank[b.severity]);
  }
  return claims.filter((claim) => claim.section === section);
}

/**
 * Up to three server-supplied questions, submitted through the same session
 * action as a typed question. Renders nothing when the scope has none.
 */
export function SuggestedQuestions({ session }: { session: CopilotSession }) {
  if (session.suggestedQuestions.length === 0) return null;

  return (
    <section aria-label="Suggested questions" className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Suggested questions
      </p>
      <div className="flex flex-col items-start gap-1">
        {session.suggestedQuestions.slice(0, 3).map((question) => (
          <Button
            key={question}
            variant="ghost"
            size="sm"
            className="h-auto justify-start whitespace-normal text-left text-sm text-primary"
            onClick={() => session.submit(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </section>
  );
}

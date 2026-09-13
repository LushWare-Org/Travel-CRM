import { Bot, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  ClaimSection,
  CopilotClaim,
  CopilotContext,
  CopilotSession,
  InsightProducer,
} from "./types";

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
 * One rendered group in the findings list.
 *
 * `critical` is a severity BAND, not a section. It is a distinct member rather
 * than another `section` value so the renderer cannot accidentally give it a
 * section heading: the two answer different questions (how urgent is this vs
 * what kind of finding is it) and `DESIGN.md` gives them different marks — the
 * band carries the destructive token and an icon, a section heading does not.
 */
export type InsightBucket =
  | { kind: "critical"; claims: CopilotClaim[] }
  | { kind: "section"; section: ClaimSection; claims: CopilotClaim[] };

/**
 * Group a rendered source into the buckets the list draws, in order.
 *
 * The rule, in full:
 *
 *   1. Every `critical` goes to one leading `critical` bucket, in input order.
 *   2. The rest are grouped by `section`.
 *   3. Inside a bucket, the order depends on `ordering`: preserved exactly for
 *      `"server"`, `claimsIn`'s for `"panel"`.
 *
 * Two properties make this safe to run over the server's ranked list, and both
 * are asserted in the test file:
 *
 * - **The critical bucket reproduces the server's own prefix.** `rank.js`
 *   splits `criticals` from `rest` before budgeting (`:55-56`) and returns
 *   `[...shownCriticals, ...withSpread.picked]` (`:116`), so the ranked list
 *   already leads with a contiguous run of criticals and `picked` contains none.
 *   Hoisting them is therefore not a client-side re-grouping of the server's
 *   output; it is re-deriving the structure the server already produced.
 * - **Concatenating the buckets returns the input as a permutation.** Nothing is
 *   lost and nothing is duplicated, so grouping cannot drop a finding.
 *
 * What it deliberately does NOT preserve: global severity order. `section` and
 * `severity` are independent, so a `warning` in the head section can precede a
 * `warning`... an `info` from a later section can precede a `warning` the server
 * ranked higher. The band that matters is protected; the residual is accepted
 * and stated in the design doc rather than claimed away.
 *
 * Rule 3 is load-bearing, and getting it wrong twice is why it is stated this
 * flatly. Applying `claimsIn`'s sort on the RANKED source overrules the server,
 * and `CollectionInsights.ranked.test.tsx` exists to say why the client is not
 * entitled to disagree. On an unranked source there is no server order to
 * overrule, so the panel's severity ordering is presentation rather than
 * presumption.
 *
 * `ordering` names which authority owns the sequence, because the two sources
 * need opposite treatment:
 *
 * - `"server"` — the input order IS the ranking. Buckets preserve it exactly, and
 *   the head of the remaining list leads so the server's own top item is the
 *   first row rendered instead of being buried under the panel's preferred
 *   section.
 * - `"panel"` (default) — the caller has no ranking, so the panel supplies the
 *   order it always has: `claimsIn`'s severity ordering for `attention`, and
 *   `order` for the sections.
 *
 * The default is `"panel"` because that is the pre-existing behaviour; opting
 * into `"server"` is a deliberate statement that the input is ranked.
 */
export function sectionBuckets(
  claims: CopilotClaim[],
  order: ClaimSection[],
  { ordering = "panel" }: { ordering?: "server" | "panel" } = {},
): InsightBucket[] {
  if (claims.length === 0) return [];

  const criticals = claims.filter((claim) => claim.severity === "critical");
  const rest = criticals.length > 0 ? claims.filter((claim) => claim.severity !== "critical") : claims;

  const head = ordering === "server" ? rest[0]?.section : undefined;
  const sectionOrder = head ? [head, ...order.filter((section) => section !== head)] : order;

  const buckets: InsightBucket[] = [];
  if (criticals.length > 0) buckets.push({ kind: "critical", claims: criticals });

  for (const section of sectionOrder) {
    const inSection =
      ordering === "server" ? rest.filter((claim) => claim.section === section) : claimsIn(rest, section);
    if (inSection.length > 0) buckets.push({ kind: "section", section, claims: inSection });
  }

  return buckets;
}

export function formatMoment(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

/**
 * Who wrote the list, and when.
 *
 * One marker for both panels, defined once, because the derivation is the thing
 * that must not drift: `producer` decides the word, the clock, AND the timestamp.
 * Selecting the timestamp off the phase instead of the producer is exactly how
 * the header ends up reading "Rule engine · Generated <model run time>", which
 * pairs a rule-computed list with the model's word and clock.
 *
 * An icon plus a word, never colour alone: `DESIGN.md` allows no hue here, and
 * the marker must survive grayscale, high-contrast mode, and a monochrome print.
 * No teal is spent — authorship is not the same thing as the accent.
 *
 * This names the LIST's producer, which is a smaller claim than it looks: it is
 * derived from which pipeline produced the rendered source, not from any
 * per-claim field. `origin` cannot answer it — that exists only on
 * `DeterministicInsightSchema`, so model claims carry none.
 */
export function ProducerLine({
  producer,
  context,
}: {
  producer: InsightProducer;
  context: CopilotContext | null;
}) {
  const moment = formatMoment(producer === "model" ? context?.generatedAt : context?.asOf);
  if (!moment) return null;

  const isModel = producer === "model";
  const Icon = isModel ? Bot : Cpu;

  return (
    <p className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{isModel ? "AI briefing" : "Rule engine"}</span>
      <span aria-hidden="true">·</span>
      <span className="sr-only">, </span>
      <span>{isModel ? "Generated" : "Checked"}</span>
      <span className="font-mono tabular-nums">{moment}</span>
    </p>
  );
}

/**
 * Up to three server-supplied questions. A click sends one, exactly as if the
 * operator had typed it — the block is a shortcut past the wording, not a draft
 * of it. Renders nothing when the scope has none.
 */
export function SuggestedQuestions({
  session,
  onAsk,
}: {
  session: CopilotSession;
  /** Send the question as the operator's own turn. */
  onAsk: (question: string) => void;
}) {
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
            onClick={() => onAsk(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </section>
  );
}

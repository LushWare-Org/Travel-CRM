import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle, Sparkles, ShieldOff, CornerDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copilotDeterministic, copilotBriefing, copilotAsk } from "@/services/copilotAPI";

type Fact = { kind: string; value: string; evidenceId: string };
type Claim = {
  id: string;
  section: "current_state" | "changed" | "attention" | "experienced_view";
  text: string;
  facts: Fact[];
  evidenceIds: string[];
  evidenceType: string;
  severity: "info" | "warning" | "critical";
};
type Source = { id: string; label: string; type: string; updatedAt?: string };
type ContextStamp = { pageKey: string; scopeLabel: string; generatedAt?: string; asOf?: string; partial: boolean; noAccess: boolean };

const SECTION_ORDER: Claim["section"][] = ["current_state", "changed", "attention", "experienced_view"];
const SECTION_LABELS: Record<Claim["section"], string> = {
  current_state: "Current state",
  changed: "What changed",
  attention: "Needs attention",
  experienced_view: "Experienced view",
};

function severityClass(severity: Claim["severity"]) {
  if (severity === "critical") return "text-destructive";
  if (severity === "warning") return "text-warning";
  return "text-muted-foreground";
}

function factLabel(kind: string, value: string) {
  // Tabular values render in the data (mono) face; the kind is a muted caption.
  return value;
}

interface ManagementContextCopilotProps {
  pageKey: string;
  scope: Record<string, unknown>;
  scopeLabel: string;
  since?: "last_visit" | "today" | "7_days";
}

// Read-only, cited situation briefing + drill-down panel. Two-phase render:
// the deterministic phase paints immediately, the model briefing appends.
// Mounted beside the route outlet; collapsible; never covers the page.
export default function ManagementContextCopilot({ pageKey, scope, scopeLabel, since = "last_visit" }: ManagementContextCopilotProps) {
  const scopeKey = useMemo(() => JSON.stringify(scope), [scope]);
  const hasScope = useMemo(() => scope != null && Object.keys(scope).length > 0, [scopeKey]);

  const [context, setContext] = useState<ContextStamp | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  // Two-phase load: deterministic first, then briefing.
  useEffect(() => {
    let cancelled = false;
    if (!hasScope) {
      setLoading(false);
      setClaims([]);
      return () => {
        cancelled = true;
      };
    }
    setLoading(true);
    setError(null);
    setClaims([]);
    setAnswers([]);
    setSources([]);
    setQuestions([]);

    (async () => {
      try {
        const det = await copilotDeterministic({ pageKey, scope, since });
        if (cancelled) return;
        setContext({
          pageKey: det.context.pageKey,
          scopeLabel: det.context.scopeLabel,
          asOf: det.context.asOf,
          partial: false,
          noAccess: det.context.noAccess,
        });
        // Deterministic insights render as claims of the same shape.
        const insightClaims: Claim[] = (det.insights ?? []).map((i: any) => ({
          id: i.id,
          section: i.section,
          text: i.text,
          facts: i.fact ? [i.fact] : [],
          evidenceIds: i.evidenceIds ?? [],
          evidenceType: "computed",
          severity: i.severity,
        }));
        setClaims(insightClaims);

        if (det.context.noAccess) {
          setLoading(false);
          return;
        }

        const br = await copilotBriefing({ pageKey, scope, since });
        if (cancelled) return;
        setContext({
          pageKey: br.context.pageKey,
          scopeLabel: br.context.scopeLabel,
          generatedAt: br.context.generatedAt,
          partial: br.context.partial,
          noAccess: br.context.noAccess,
        });
        setClaims(br.claims ?? []);
        setSources(br.sources ?? []);
        setQuestions(br.suggestedQuestions ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load briefing");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pageKey, scopeKey, since]);

  async function ask(text: string) {
    if (!text.trim() || asking) return;
    setAsking(true);
    setQuestion("");
    try {
      const res = await copilotAsk({
        pageKey,
        scope,
        since,
        messages: [{ role: "user", content: text.trim() }],
      });
      if (res.answerBlocks?.length) {
        setAnswers((prev) => [...prev, ...res.answerBlocks]);
      }
      if (res.sources?.length) setSources(res.sources);
    } catch (e: any) {
      setError(e?.message ?? "Failed to answer");
    } finally {
      setAsking(false);
    }
  }

  function renderClaims(list: Claim[]) {
    return SECTION_ORDER.map((section) => {
      const items = list.filter((c) => c.section === section);
      if (items.length === 0) return null;
      return (
        <div key={section} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {SECTION_LABELS[section]}
          </p>
          {items.map((c) => (
            <div key={c.id} className="space-y-1">
              <p className={`text-sm ${severityClass(c.severity)}`}>{c.text}</p>
              {c.facts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {c.facts.map((f, i) => (
                    <span
                      key={i}
                      className="font-mono text-xs tabular-nums rounded-sm bg-secondary px-1.5 py-0.5 text-foreground"
                      title={`${f.kind}`}
                    >
                      {factLabel(f.kind, f.value)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    });
  }

  if (collapsed) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setCollapsed(false)} className="fixed top-20 right-4 z-50 gap-1.5 shadow-dropdown">
        <Sparkles className="h-4 w-4" />
        Copilot
      </Button>
    );
  }

  return (
    <Card className="fixed top-20 right-4 z-50 w-80 max-h-[80vh] border shadow-dropdown flex flex-col overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Copilot
          </CardTitle>
          <Button variant="ghost" size="xs" onClick={() => setCollapsed(true)} aria-label="Collapse copilot">
            ×
          </Button>
        </div>
        {context && (
          <p className="text-xs text-muted-foreground">
            {context.scopeLabel}
            {context.generatedAt ? ` · updated ${new Date(context.generatedAt).toLocaleTimeString()}` : ""}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 overflow-y-auto">
        {!hasScope && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 mt-0.5 text-primary" />
            Open a lead to see its AI situation briefing.
          </div>
        )}

        {hasScope && loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing…
          </div>
        )}

        {context?.noAccess && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <ShieldOff className="h-4 w-4" />
            You do not have access to this record.
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-warning">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!context?.noAccess && renderClaims(claims)}

        {!context?.noAccess && answers.length > 0 && (
          <div className="space-y-2 border-t pt-2">
            {answers.map((a) => (
              <div key={a.id} className="space-y-1">
                <p className="text-sm">{a.text}</p>
                {a.facts.map((f, i) => (
                  <span key={i} className="mr-1.5 font-mono text-xs tabular-nums text-foreground">
                    {f.value}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}

        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t pt-2">
            {sources.map((s) => (
              <span key={s.id} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                {s.label}
              </span>
            ))}
          </div>
        )}

        {questions.length > 0 && !context?.noAccess && (
          <div className="space-y-1 border-t pt-2">
            {questions.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="flex w-full items-center gap-1 text-left text-sm text-primary hover:underline"
              >
                <CornerDownRight className="h-3.5 w-3.5" />
                {q}
              </button>
            ))}
          </div>
        )}

        {!context?.noAccess && (
          <form
            className="flex gap-2 pt-1"
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask about ${scopeLabel}…`}
              disabled={asking}
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" disabled={asking || !question.trim()}>
              {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

import { AlertTriangle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

type CopilotRailProps = {
  onExpand: () => void;
  /** Derived from real warning/critical claims only — never an unread count. */
  hasAttention: boolean;
};

/**
 * The collapsed desktop dock: a 40px rail with one labeled, keyboard-accessible
 * control and, only when the active briefing really carries a warning or
 * critical claim, one semantic attention marker.
 */
export default function CopilotRail({ onExpand, hasAttention }: CopilotRailProps) {
  return (
    <aside
      aria-label="Copilot"
      className="sticky top-0 hidden h-dvh w-10 shrink-0 flex-col items-center border-l border-border bg-card py-4 xl:flex"
    >
      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onExpand} aria-label="Open copilot">
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
      </Button>

      {hasAttention && (
        <span
          role="img"
          aria-label="This lead has items needing attention."
          title="This lead has items needing attention."
          data-copilot-attention-marker="true"
          className="mt-3 text-warning"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </aside>
  );
}

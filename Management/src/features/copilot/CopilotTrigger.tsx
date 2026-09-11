import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The floating (and below-`xl`) trigger's accessible name. */
export const COPILOT_TRIGGER_LABEL = "Open copilot";

/** The rail's edge-anchored control. Deliberately distinct from the floating
 *  trigger's name so the two controls are never ambiguous. */
export const COPILOT_RAIL_LABEL = "Expand copilot panel";

/** The attention marker's accessible name, shared by the rail and the floating
 *  trigger so the marker can never drift between the two surfaces. */
export const ATTENTION_LABEL = "This lead has items needing attention.";

type CopilotTriggerProps = Omit<
  ComponentPropsWithoutRef<typeof Button>,
  "className" | "variant" | "children"
> & {
  className?: string;
  /** Derived from real warning/critical claims only — never an unread count. */
  hasAttention: boolean;
};

/**
 * The single labeled copilot trigger, shared by the below-`xl` drawer and the
 * `xl`+ collapsed floating control.
 *
 * The attention state is a sibling of the button, never a child: a button's
 * contents are presentational in the accessibility tree, so a marker (and the
 * `sr-only` sentence that used to sit inside it) would never be exposed. The
 * pair is:
 *
 * - a sibling `role="img"` span — the accessible name, announced once; and
 * - a visible `aria-hidden` glyph beside the label, so the state is never
 *   colour-only.
 */
const CopilotTrigger = forwardRef<HTMLElement, CopilotTriggerProps>(function CopilotTrigger(
  { hasAttention, className, ...props },
  ref
) {
  return (
    <div className="flex items-center gap-1">
      <Button
        {...props}
        ref={ref}
        variant="outline"
        aria-label={COPILOT_TRIGGER_LABEL}
        className={`h-11 min-w-11 gap-2 bg-card px-3 shadow-dropdown ${className ?? ""}`}
      >
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm">Copilot</span>
        {hasAttention && <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden="true" />}
      </Button>

      {hasAttention && (
        <span
          role="img"
          aria-label={ATTENTION_LABEL}
          title={ATTENTION_LABEL}
          data-copilot-attention-marker="true"
          className="h-2 w-2 shrink-0 rounded-full bg-warning"
        />
      )}
    </div>
  );
});

export default CopilotTrigger;

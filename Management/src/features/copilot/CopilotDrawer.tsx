import { useRef, type ReactNode } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import CopilotSurface from "./CopilotSurface";
import CopilotTrigger from "./CopilotTrigger";

/**
 * The heading that names the panel. Both the drawer and the `xl`+ desktop
 * trigger move focus onto it on open, so the element the operator lands on is
 * the one that labels the region they just opened. Rendered by `LeadBriefing`
 * (record scopes) or `CollectionBriefing` (collection scopes).
 */
const DRAWER_HEADING_ID = "copilot-briefing-heading";

type CopilotDrawerProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasAttention: boolean;
  /** One-time "Lead briefing ready" cue: truthful status copy, not a count. */
  showCue: boolean;
  onDismissCue: () => void;
};

/**
 * Below `xl` the record keeps the full content column and the same session body
 * opens in a right-edge modal drawer. It reuses Dialog's portal, overlay, focus
 * trap, Escape dismissal, scroll lock, and focus restoration; opening moves
 * focus to the drawer heading and closing returns it to the trigger.
 */
export default function CopilotDrawer({
  children,
  open,
  onOpenChange,
  hasAttention,
  showCue,
  onDismissCue,
}: CopilotDrawerProps) {
  // The element is a button, and DialogTrigger's `ref` is typed to match:
  // pass a narrower ref here rather than the `HTMLElement` this used to hold,
  // which only typechecked while it was handed to Button as a prop.
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-1.5 xl:hidden">
        {showCue && (
          <p
            role="status"
            className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground shadow-dropdown"
          >
            Lead briefing ready
          </p>
        )}

        <div className="flex items-center gap-1">
          <DialogTrigger
            ref={triggerRef}
            render={(props) => <CopilotTrigger {...props} hasAttention={hasAttention} />}
          />

          {showCue && (
            <Button variant="ghost" size="icon-sm" onClick={onDismissCue} aria-label="Dismiss briefing ready cue">
              <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <DialogContent
        showCloseButton={false}
        aria-label="Copilot"
        aria-describedby={undefined}
        initialFocus={() => document.getElementById(DRAWER_HEADING_ID)}
        finalFocus={triggerRef}
        className="fixed inset-y-0 top-0 right-0 left-auto z-50 flex h-[100dvh] w-[min(420px,90vw)] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-l border-border bg-card p-0 pb-[env(safe-area-inset-bottom)] ring-0 duration-200 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right sm:max-w-none max-md:w-full"
      >
        <div className="flex justify-end border-b border-border px-3 py-2">
          <Button variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Close copilot">
            <XIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <CopilotSurface className="px-4 py-4 scroll-pb-24">{children}</CopilotSurface>
      </DialogContent>
    </Dialog>
  );
}

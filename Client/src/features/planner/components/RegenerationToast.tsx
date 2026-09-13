import { useEffect, useRef } from 'react';

interface RegenerationToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

/** Auto-dismissing success toast with an Undo action, shown after per-day or
 * bulk AI itinerary regeneration (docs/designs/granular-ai-itinerary-generation.md
 * UI/UX Specifications: "toast with Undo" on success; storyboard step 3:
 * toast "Day 3 regenerated — Undo"). */
export default function RegenerationToast({ message, onUndo, onDismiss }: RegenerationToastProps) {
  // onDismiss is a fresh inline closure on every parent render (both call
  // sites pass `() => setRegenToast(null)`), so it can't be a dependency —
  // that would restart the 6s timer on every keystroke elsewhere in the
  // form. Keep the latest callback in a ref and key the effect on `message`
  // (identity changes only when a new toast actually appears) instead.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-xl"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="font-semibold text-brand-300 underline hover:text-brand-200"
      >
        Undo
      </button>
    </div>
  );
}

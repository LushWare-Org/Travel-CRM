import { useCallback, useState } from "react";

/**
 * Polite live-region announcements. One region per surface (insights and
 * conversation) so a reveal or a queued replacement is announced once, in the
 * region nearest the action that produced it.
 */
export function useAnnouncer(): [string, (message: string) => void] {
  const [message, setMessage] = useState("");
  const announce = useCallback((next: string) => setMessage(next), []);
  return [message, announce];
}

export function LiveStatus({ message, className }: { message: string; className?: string }) {
  return (
    <p role="status" aria-live="polite" className={className ?? "sr-only"}>
      {message}
    </p>
  );
}

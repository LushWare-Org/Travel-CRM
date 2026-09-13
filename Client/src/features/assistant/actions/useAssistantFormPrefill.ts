import { useCallback, useState } from 'react';
import type { AssistantFormFieldState } from '../capabilities/AssistantCapabilityProvider';

/**
 * What a field holds and who put it there, read from the page's own state.
 * `assistantWritten` is the page's mark on that field; an empty field has no
 * author at all, which is what makes an empty field always fillable.
 */
export const assistantFieldState = (
  value: string | number,
  assistantWritten: boolean,
): AssistantFormFieldState => {
  if (`${value}`.trim() === '') return { value, source: 'empty' };
  return { value, source: assistantWritten ? 'assistant' : 'visitor' };
};

/**
 * Which of a form's fields hold a value the ASSISTANT wrote.
 *
 * Two behaviours hang off this one set: the marker on the field (colour plus a
 * badge, per DESIGN.md) and the collision rule — a field the visitor typed in is
 * never overwritten without a confirm, while a field the assistant filled is
 * simply corrected. A user edit clears the mark, which is what makes the badge
 * mean "this is still the assistant's value" rather than "the assistant once
 * touched this form".
 */
export function useAssistantWrittenFields() {
  const [written, setWritten] = useState<Set<string>>(() => new Set());

  const markWritten = useCallback((fields: string[]) => {
    setWritten((prev) => new Set([...prev, ...fields]));
  }, []);

  const clearWritten = useCallback((field: string) => {
    setWritten((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }, []);

  return { written, markWritten, clearWritten };
}

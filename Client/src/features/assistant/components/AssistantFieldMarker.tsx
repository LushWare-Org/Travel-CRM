import { Sparkles } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

/**
 * The two halves of the assistant-written marker, per `Client/DESIGN.md`'s
 * Assistant Affordances section.
 *
 * Colour is never the only signal: a marked field carries a tinted control and an
 * adjacent badge whose text says who put the value there, so the mark survives
 * colour blindness, high-contrast mode and monochrome. Green rather than gold —
 * the system's one accent means "informational" here, while gold means featured —
 * and never a red-family colour, which means destructive.
 */
export const assistantMarkedFieldClass = (assistantWritten?: boolean): string =>
  assistantWritten ? 'bg-brand-50 border-brand-200' : '';

/** The non-colour half: what the value is and where it came from. */
export function AssistantFilledBadge() {
  return (
    <Badge variant="outline" className="gap-1">
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      Filled by assistant
    </Badge>
  );
}

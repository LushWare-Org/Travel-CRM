import { useState } from 'react';
import { generateDayPreview, generateDaysRangePreview, type AIGeneratedDay } from '../../../services/api/aiDayGeneration';
import type { ExistingDayContext } from '../utils/formHelpers';

interface DayGenerationContext {
  destination: string;
  totalDuration: number;
  travelers?: number;
  preferences?: string;
  existingDays: ExistingDayContext[];
}

interface UseAIDayGeneratorOptions<TDay> {
  /** Trip-level params + the other days, read fresh at call time (mirrors
   * useAIItineraryGenerator's hasExistingDays()) so a stale closure never
   * ships outdated form state. */
  getContext: () => DayGenerationContext;
  /** Maps an AI day onto the container's day-state shape. `dayNumber` is
   * always the requested slot (already forced server-side), so containers
   * reuse their existing buildItineraryDayFromAIDay/buildDayState mappers by
   * passing `dayNumber - 1` as the index argument. */
  mapDay: (aiDay: AIGeneratedDay, dayNumber: number) => TDay;
  onDayGenerated: (day: TDay, dayNumber: number) => void;
  onDaysGenerated: (days: TDay[], requestedDayNumbers: number[]) => void;
}

/** Per-day / bulk-range counterpart to useAIItineraryGenerator: regenerates
 * or fills specific days in place instead of replacing the whole trip. */
export function useAIDayGenerator<TDay>({ getContext, mapDay, onDayGenerated, onDaysGenerated }: UseAIDayGeneratorOptions<TDay>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingDayNumber, setGeneratingDayNumber] = useState<number | null>(null);
  const [error, setError] = useState('');

  const generateDay = async (dayNumber: number) => {
    const context = getContext();
    setError('');
    setIsGenerating(true);
    setGeneratingDayNumber(dayNumber);
    try {
      const { day } = await generateDayPreview({
        destination: context.destination,
        dayNumber,
        totalDuration: context.totalDuration,
        travelers: context.travelers,
        preferences: context.preferences,
        existingDays: context.existingDays,
      });
      onDayGenerated(mapDay(day, dayNumber), dayNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate this day. Please try again.');
    } finally {
      setIsGenerating(false);
      setGeneratingDayNumber(null);
    }
  };

  const generateDays = async (dayNumbers: number[]) => {
    if (dayNumbers.length === 0) return;
    const context = getContext();
    setError('');
    setIsGenerating(true);
    try {
      const { days } = await generateDaysRangePreview({
        destination: context.destination,
        dayNumbers,
        totalDuration: context.totalDuration,
        travelers: context.travelers,
        preferences: context.preferences,
        existingDays: context.existingDays,
      });
      const returnedByDayNumber = new Map(days.map((d) => [d.dayNumber, d]));
      const mapped = dayNumbers
        .filter((n) => returnedByDayNumber.has(n))
        .map((n) => mapDay(returnedByDayNumber.get(n) as AIGeneratedDay, n));
      if (mapped.length > 0) onDaysGenerated(mapped, dayNumbers);
      if (mapped.length < dayNumbers.length) {
        setError(`${mapped.length} of ${dayNumbers.length} days generated. Click again to fill the rest.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate days. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, generatingDayNumber, error, generateDay, generateDays };
}

/**
 * Brand theme helpers.
 *
 * PALETTE mirrors palettes/lush.json, which Client/src/index.css's @theme
 * block also mirrors directly (Phase 0 of the Client rewamp — see
 * docs/CLIENT-REWAMP-PLAN.md). A new deployment re-themes by editing both
 * src/config/palettes/lush.json and index.css's @theme block; these
 * helpers expose the JSON values to JS callers that can't use CSS
 * variables (PDF generation, which renders to a canvas/PDF document, not
 * the DOM).
 */
import PALETTE from './palettes/lush.json';

export { PALETTE };

export const hexToRgb = (hex: string): [number, number, number] => {
  const cleaned = String(hex || '').replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return [0, 0, 0];
  const int = parseInt(cleaned, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};


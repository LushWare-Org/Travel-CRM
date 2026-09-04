/**
 * Brand theme helpers.
 *
 * PALETTE mirrors palettes/lush.json (which tailwind.config.js also reads,
 * independently, for its own Node/CJS load context). A new deployment
 * re-themes by editing src/config/palettes/lush.json; these helpers expose
 * the same values to JS (PDF generation) and CSS variables.
 */
import PALETTE from './palettes/lush.json';

export { PALETTE };

export const hexToRgb = (hex: string): [number, number, number] => {
  const cleaned = String(hex || '').replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return [0, 0, 0];
  const int = parseInt(cleaned, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

/**
 * Sets --brand-{shade} and --brand-{shade}-rgb on :root so index.css and
 * inline styles can reference brand colors without hardcoded hex literals.
 */
export const applyCssVariables = (): void => {
  const root = document.documentElement;
  const setShade = (family: string, shades: Record<string, string>): void => {
    Object.entries(shades).forEach(([shade, hex]) => {
      const [r, g, b] = hexToRgb(hex);
      root.style.setProperty(`--${family}-${shade}`, hex);
      root.style.setProperty(`--${family}-${shade}-rgb`, `${r}, ${g}, ${b}`);
    });
  };
  setShade('brand', PALETTE.brand);
  setShade('brand-accent', PALETTE.brandAccent);
  setShade('brand-dark', PALETTE.brandDark);
  if (PALETTE.neutral) {
    setShade('neutral', PALETTE.neutral);
  }
  root.style.setProperty('--font-display', PALETTE.fonts.display);
  root.style.setProperty('--font-body', PALETTE.fonts.body);
};

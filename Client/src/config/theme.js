/**
 * Brand theme helpers.
 *
 * PALETTE mirrors brandPalette.json (which tailwind.config.js also reads).
 * A new company re-themes by editing src/config/brandPalette.json; these
 * helpers expose the same values to JS (PDF generation) and CSS variables.
 */
import PALETTE from './brandPalette.json';

export { PALETTE };

export const hexToRgb = (hex) => {
  const cleaned = String(hex || '').replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return [0, 0, 0];
  const int = parseInt(cleaned, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
};

/**
 * Sets --brand-{shade} and --brand-{shade}-rgb on :root so index.css and
 * inline styles can reference brand colors without hardcoded hex literals.
 */
export const applyCssVariables = () => {
  const root = document.documentElement;
  const setShade = (family, shades) => {
    Object.entries(shades).forEach(([shade, hex]) => {
      const [r, g, b] = hexToRgb(hex);
      root.style.setProperty(`--${family}-${shade}`, hex);
      root.style.setProperty(`--${family}-${shade}-rgb`, `${r}, ${g}, ${b}`);
    });
  };
  setShade('brand', PALETTE.brand);
  setShade('brand-accent', PALETTE.brandAccent);
  setShade('brand-dark', PALETTE.brandDark);
};

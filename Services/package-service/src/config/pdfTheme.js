// Local, hardcoded color theme for package PDF generation — mirrors the
// shape billing-service's quotationPDFGenerator.js consumes (ink/muted/
// brand/brandDark/slate200/white) so the drawing code shares the same
// visual vocabulary, but keeps package-service's own brick-red accent
// instead of the org-configured brand color. Text identity (company name,
// footer tagline) is NOT hardcoded here — see ./orgSettings.js, which
// fetches it live so the PDF always reflects what's actually configured.

export const theme = {
  ink: '#1F2937',
  muted: '#64748B',
  brand: '#C0392B',
  brandDark: '#96291C',
  slate200: '#E2E8F0',
  white: '#FFFFFF',
};

export default { theme };

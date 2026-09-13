// Local, hardcoded color theme for package PDF generation — mirrors the
// shape billing-service's quotationPDFGenerator.js consumes (ink/muted/
// brand/brandDark/slate200/white) so the drawing code shares the same
// visual vocabulary. brand/brandDark match billing-service's default
// accent (and the Client site's actual orange/amber brand identity), kept
// as its own constant here rather than wired through ./orgSettings.js.
// Text identity (company name, footer tagline) is NOT hardcoded here — see
// ./orgSettings.js, which fetches it live so the PDF always reflects what's
// actually configured.

export const theme = {
  ink: '#1F2937',
  muted: '#64748B',
  brand: '#F5A623',
  brandDark: '#D98A0B',
  slate200: '#E2E8F0',
  white: '#FFFFFF',
};

export default { theme };

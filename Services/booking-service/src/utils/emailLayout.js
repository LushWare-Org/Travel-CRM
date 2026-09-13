// Static LushTravel-brand HTML email layout, shared by auth/booking/career
// templates. Duplicated per-service (no live org-branding source here, unlike
// billing-service, which pulls per-organization branding from user-service) —
// keep the three copies (auth-service, booking-service, career-service)
// identical; if this needs to change, change it in all three.

const BRAND = '#0578A2'; // Client/Management tailwind.config.js `brand`
const INK = '#0F172A';
const MUTED = '#64748B';
const SLATE_50 = '#F8FAFC';
const SLATE_200 = '#E2E8F0';

export const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Wraps body HTML in a full, table-based HTML email document.
 * @param {object} params
 * @param {string} params.title - <title> content
 * @param {string} [params.preheader] - ~50-100 char inbox-preview summary (hidden in body)
 * @param {string} params.bodyHtml - inner content HTML; caller is responsible for escaping
 *   any user-supplied strings via `escapeHtml` before interpolating them
 */
export function renderEmailLayout({ title, preheader = '', bodyHtml }) {
  // Ellipsis/padding trick: pad past what Gmail/Outlook show so the next
  // line of real body text doesn't leak into the inbox preview.
  const preheaderPadded = preheader ? `${escapeHtml(preheader)}${'&nbsp;&zwnj;'.repeat(80)}` : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${SLATE_50};font-family:Arial,Helvetica,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheaderPadded}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${SLATE_50};">
  <tr>
    <td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:#FFFFFF;border:1px solid ${SLATE_200};border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background-color:${BRAND};padding:24px 32px;">
            <span style="font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:0.3px;font-family:Arial,Helvetica,sans-serif;">LushTravel</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;color:${INK};font-size:15px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${SLATE_200};color:${MUTED};font-size:12px;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">
            LushTravel CRM &middot; This is an automated message, please do not reply to this email.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Table-wrapped, bulletproof-ish CTA button (not a bare styled <a>). */
export function renderButton({ href, label }) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
  <tr>
    <td style="border-radius:6px;background-color:${BRAND};">
      <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:6px;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

/**
 * Two-column label/value info table (e.g. lead or applicant details).
 * Rows with empty/undefined/null values are skipped.
 */
export function renderInfoTable(rows) {
  const trs = rows
    .filter((r) => r.value !== undefined && r.value !== null && r.value !== '')
    .map(
      (r) => `<tr>
        <td style="padding:8px 12px;background-color:${SLATE_50};border:1px solid ${SLATE_200};font-weight:600;width:140px;color:${INK};font-size:13px;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(r.label)}</td>
        <td style="padding:8px 12px;border:1px solid ${SLATE_200};color:${INK};font-size:13px;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(String(r.value))}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:16px 0;">${trs}</table>`;
}

export default { renderEmailLayout, renderButton, renderInfoTable, escapeHtml };

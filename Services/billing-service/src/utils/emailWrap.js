// Thin full-HTML-document wrapper for billing-service's existing, already
// well-designed per-organization branded email content (see the *EmailHtml()
// functions in emailService.js). Unlike auth/booking/career's static
// emailLayout.js, this pulls its background color from the live `branding`
// object billing-service already fetches from user-service — it isn't
// duplicated to other services because they have no equivalent live source.

/** Wraps already-built inner content HTML in a full HTML email document. */
export function wrapBillingEmail({ branding, title, preheader = '', innerHtml }) {
  const bg = branding?.theme?.slate50 || '#F8FAFC';
  const preheaderPadded = preheader ? `${preheader}${'&nbsp;&zwnj;'.repeat(80)}` : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${bg};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheaderPadded}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bg};">
  <tr>
    <td align="center" style="padding:24px 16px;">
      ${innerHtml}
    </td>
  </tr>
</table>
</body>
</html>`;
}

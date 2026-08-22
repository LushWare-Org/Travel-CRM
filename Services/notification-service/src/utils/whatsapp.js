import readWhatsappEnv, { isWhatsappConfigured } from '../config/whatsapp.js';

export { isWhatsappConfigured };

/** Graph API wants digits only (country code, no leading `+` or `0`). */
function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d]/g, '');
}

async function callGraphApi(payload, fetchImpl = fetch) {
  const { accessToken, phoneNumberId, apiVersion } = readWhatsappEnv();
  if (!accessToken || !phoneNumberId) {
    const err = new Error('WhatsApp is not configured (set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID)');
    err.statusCode = 503;
    throw err;
  }

  const res = await fetchImpl(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `WhatsApp send failed (status ${res.status})`);
    err.statusCode = res.status === 401 || res.status === 403 ? 502 : 400;
    throw err;
  }
  return data;
}

/**
 * Send a pre-approved WhatsApp message template — the only way to reach a
 * customer outside a 24h session window. `headerDocument` maps to the
 * template's Document header (a Cloudinary-hosted PDF link in this app);
 * `bodyParams` fill the template's positional {{1}}, {{2}}, ... placeholders.
 */
export async function sendWhatsappTemplateMessage({
  to,
  templateName,
  languageCode = 'en_US',
  headerDocument,
  bodyParams = [],
  fetchImpl = fetch,
}) {
  const components = [];
  if (headerDocument?.link) {
    components.push({
      type: 'header',
      parameters: [{ type: 'document', document: { link: headerDocument.link, filename: headerDocument.filename } }],
    });
  }
  if (bodyParams.length) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((text) => ({ type: 'text', text: String(text ?? '') })),
    });
  }

  return callGraphApi(
    {
      to: normalizePhone(to),
      type: 'template',
      template: { name: templateName, language: { code: languageCode }, components },
    },
    fetchImpl
  );
}

/**
 * Free-form text reply — only accepted by Meta within 24h of the customer's
 * last inbound message; used for agent replies from the CRM, never for the
 * business-initiated document notifications.
 */
export async function sendWhatsappTextMessage({ to, body, fetchImpl = fetch }) {
  return callGraphApi(
    {
      to: normalizePhone(to),
      type: 'text',
      text: { body, preview_url: false },
    },
    fetchImpl
  );
}

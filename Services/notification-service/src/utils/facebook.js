import { verifyWebhookSignature } from './webhookSignature.js';

export { verifyWebhookSignature };

export async function getLeadData(leadgenId, accessToken) {
  const url = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Facebook API error: ${res.status}`);
  return res.json();
}

export function mapFacebookLeadToLead(fbData) {
  const fields = {};
  for (const f of fbData.field_data || []) {
    fields[f.name.toLowerCase()] = f.values?.[0] || '';
  }
  return {
    name: fields.full_name || fields.name || '',
    email: fields.email || '',
    phone: fields.phone_number || fields.phone || '',
    source: 'social_media',
    platform: 'Social_Media',
    message: fields.comments || fields.message || '',
    tags: ['facebook-lead'],
    leadDateTime: new Date(),
    status: 'new',
  };
}

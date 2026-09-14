export function normalizePhone(value) {
  if (value === null || value === undefined) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits.length ? digits : null;
}

export function withNormalizedPhones(data) {
  const out = { ...data };
  if ('phone' in data) out.phoneNormalized = normalizePhone(data.phone);
  if ('whatsapp' in data) out.whatsappNormalized = normalizePhone(data.whatsapp);
  return out;
}

export function phoneMatchWhere(value) {
  const digits = normalizePhone(value);
  if (!digits) return null;
  return { OR: [{ phoneNormalized: digits }, { whatsappNormalized: digits }] };
}

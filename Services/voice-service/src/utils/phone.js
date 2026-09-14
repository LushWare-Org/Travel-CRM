export function normalizePhone(value) {
  if (value === null || value === undefined) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits.length ? digits : null;
}

export function maskPhone(value) {
  const digits = normalizePhone(value);
  if (!digits) return null;
  return `***${digits.slice(-4)}`;
}

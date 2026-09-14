const BASE = () => process.env.PACKAGE_SERVICE_URL || 'http://localhost:3003';
const TIMEOUT_MS = 3000;
const MAX_RESULTS = 5;

export async function searchPackages(query, requestId) {
  const q = String(query || '').trim();
  if (!q) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE()}/api/v1/packages/search/query?q=${encodeURIComponent(q)}`, {
      headers: requestId ? { 'x-request-id': requestId } : {},
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json?.data) ? json.data : [];
    return rows.slice(0, MAX_RESULTS).map((p) => ({
      packageId: p.id,
      title: p.title,
      destination: p.destination,
      durationDays: p.durationDays ?? null,
      summary: p.description ? String(p.description).slice(0, 400) : null,
      // Deliberately no price field (basePrice/sellPrice) — see file header.
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

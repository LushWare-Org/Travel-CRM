// Local copy of billing-service's remote-image loader for pdfkit-based
// document generators — duplicated rather than shared because each service
// deploys independently with its own node_modules (no workspace package).

/**
 * Fetch a remote image URL into a Buffer for pdfkit's doc.image(). Returns
 * null (never throws) on a missing/non-http URL, a network failure, or a
 * timeout — every call site degrades to its existing placeholder rather than
 * failing PDF generation over a broken image link.
 */
export async function loadRemoteImageBuffer(url, { timeoutMs = 5000 } = {}) {
  if (!url || typeof url !== 'string' || !/^https?:/i.test(url)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export default loadRemoteImageBuffer;

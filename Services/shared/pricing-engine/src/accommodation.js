/**
 * Accommodation is a per-day cost the engine does not derive from other lines.
 * Each entry is either a number or { totalAmount } for a night's stay.
 *
 * @param {Array<number|{totalAmount?: number}>} accommodation
 * @returns {{ total: number, rows: Array<{ amount: number }> }}
 */
export function calculateAccommodationCosts(accommodation = []) {
  const rows = (accommodation || []).map((entry) => {
    const amount =
      typeof entry === 'object' && entry !== null
        ? Number(entry.totalAmount || 0)
        : Number(entry || 0);
    return { amount: Math.round(amount * 100) / 100 };
  });

  return {
    total: Math.round(rows.reduce((sum, r) => sum + r.amount, 0) * 100) / 100,
    rows,
  };
}

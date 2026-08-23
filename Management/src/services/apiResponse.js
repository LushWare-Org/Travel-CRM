/**
 * Unwraps the standard microservice list envelope: { status, data: [...], pagination: {...} }.
 * `data` is always the flat array itself and `pagination` always sits at the
 * top level — never nested under `data` (e.g. `data.users`). Centralizing
 * this here avoids re-deriving the shape (and re-introducing the same bug)
 * in every component that lists users/admins/sales reps/vendors.
 * @param {any} response - Raw response from ApiService.get()
 * @returns {{ items: any[], pagination: any }}
 */
export function unwrapList(response) {
  const items = Array.isArray(response?.data) ? response.data : [];
  const pagination = response?.pagination ?? null;
  return { items, pagination };
}

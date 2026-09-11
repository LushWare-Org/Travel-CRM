// The copilot panel's own scroll container (CopilotSurface). The dock `<aside>`
// renders a data-copilot-surface marker too, but it is not a scroller — assert
// on the surface, never on the aside.
export const SURFACE_SELECTOR = '[data-copilot-surface="surface"]';

// The reported defect in one token: a lead id, a URL inside model prose, a long
// captured value. Long enough that `overflow-wrap: normal` overflows the panel
// by hundreds of pixels, short enough to read as a real value.
export const UNBREAKABLE_TOKEN = 'A'.repeat(120);

/**
 * Every rendered copilot surface that has a live horizontal axis.
 *
 * Horizontal counterpart to the vertical ancestor check (`dockOverflowsAncestor`)
 * in lead-lifecycle.spec.js. Every copilot scroller is `overflow-y-auto`,
 * and CSS computes an unset `overflow-x: visible` to `auto` whenever the other
 * axis is not `visible` — so the panel's own scroller silently becomes a
 * horizontal scroller. The wrap contract answers with `[overflow-wrap:anywhere]`
 * on the surface (breaks the token inside the flex children instead of letting
 * it set their min-content width) plus `overflow-x-hidden` (states panel width
 * as a layout invariant, so the axis cannot come back for the next
 * unanticipated child). A surface fails here when either half stops holding:
 * content wider than the scrollport (`scrollWidth` past `clientWidth`), or a
 * horizontal axis that is live again (`overflow-x` not `hidden`).
 *
 * Display:none surfaces are skipped, so the desktop dock cannot mask a drawer
 * failure below `xl` (or the reverse).
 */
export async function surfacesWithHorizontalOverflow(page) {
  return page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)]
        .filter((el) => el.getClientRects().length > 0)
        .filter((el) => el.scrollWidth > el.clientWidth + 1 || getComputedStyle(el).overflowX !== 'hidden')
        .map((el) => ({
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          overflowX: getComputedStyle(el).overflowX,
        })),
    SURFACE_SELECTOR
  );
}

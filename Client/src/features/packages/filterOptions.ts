import type { RangeOption } from '../../components/shared/RangeFilterGroup';
import { getPriceRangeOptions } from '../../lib/currency';

/**
 * The filter bands the packages sidebar offers, in one module because two
 * components must agree on them: the sidebar renders the list, and
 * PackagesContainer matches a URL back to one of these to restore the
 * selection.
 *
 * That agreement matters more than it looks. RangeFilterGroup decides whether
 * a row is checked by comparing `selected.label` to `option.label`, not by
 * comparing bounds. A second hand-maintained copy that drifted by a single
 * character would leave a filter active with nothing shown as selected, which
 * reads as the page ignoring the visitor.
 */

export const PRICE_RANGE_OPTIONS: RangeOption[] = getPriceRangeOptions();

export const DURATION_OPTIONS: RangeOption[] = [
  { label: 'Short (1-4 days)', min: 1, max: 4 },
  { label: 'Medium (5-7 days)', min: 5, max: 7 },
  { label: 'Long (8+ days)', min: 8, max: Infinity },
];

export const RATING_OPTIONS: number[] = [5, 4, 3];

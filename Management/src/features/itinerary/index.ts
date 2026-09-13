/**
 * Feature Index
 * Main export point for the itinerary feature
 */

export { default as ItineraryGeneration } from './containers/ItineraryGenerationContainer';
export * from './hooks';
export * from './components';
export * from './utils/constants';
export * from './utils/helpers';
// `types` also declares CATEGORY_OPTIONS/TRANSPORT_OPTIONS (a legacy, pre-
// relational-schema pair distinct from utils/constants' versions). This was
// already a silent ambiguous-export collision under plain ESM (both names
// were omitted from this barrel's exports entirely, never a hard error) -
// no real consumer imports either name through this barrel (confirmed via
// grep; every actual usage imports directly from utils/constants or types),
// so re-exporting `types` explicitly minus the two colliding names just
// keeps that pre-existing (inert) gap instead of turning it into a real
// build error now that this barrel is real TypeScript.
export {
  PACKAGE_CATEGORY, MARGIN_TYPE, PLACE_TYPE, TRANSPORT_MODE, PRICING_MODEL, ROUTE_TYPE,
  createDefaultDay, createDefaultPlace, createDefaultActivity, createDefaultPackage,
  PACKAGE_DEFAULTS, LEGACY_CATEGORY_MAP, mapLegacyCategory,
} from './types';
export type { PackageCategory, MarginType, PlaceType, SelectOption, DayMeals, DayAccommodation, ItineraryDay, DefaultPlace, DefaultActivity, PackageDefaults, Package } from './types';

export const DEFAULTS = {
  mealCostPerPerson: 15,
  defaultGroupSize: 2,
};

export function withDefaults(overrides = {}) {
  return { ...DEFAULTS, ...overrides };
}

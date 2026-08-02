export const DEFAULTS = {
  mealCostPerPerson: 15,
  defaultGroupSize: 1,
};

export function withDefaults(overrides = {}) {
  return { ...DEFAULTS, ...overrides };
}

/** Renders a count with the correct singular/plural noun, e.g. pluralize(1, 'Day') -> '1 Day'. */
export const pluralize = (count: number, singular: string, plural: string = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

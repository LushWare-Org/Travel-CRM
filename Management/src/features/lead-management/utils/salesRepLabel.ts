/**
 * A sales rep as the lead pages hold it. LeadManagement's `fetchSalesReps` always
 * sets `id`; `_id` is tolerated because other endpoints return that key instead.
 */
export interface SalesRepOption {
  id: string;
  _id?: string;
  name: string;
}

export const repOptionId = (rep: SalesRepOption): string => rep.id || rep._id || '';

/**
 * The assignee's name. A lead can point at a rep who is no longer in the active
 * list, and showing "Unassigned" for one of those would invite a second
 * assignment, so the id stands in for the name instead.
 */
export function repLabelFor(assignedToId: unknown, salesReps?: SalesRepOption[]): string {
  const id = typeof assignedToId === 'string' ? assignedToId : '';
  if (!id) return 'Unassigned';
  const rep = salesReps?.find((candidate) => repOptionId(candidate) === id);
  return rep ? rep.name : id.substring(0, 8);
}

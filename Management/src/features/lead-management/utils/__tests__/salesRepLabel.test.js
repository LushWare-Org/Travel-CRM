import { describe, it, expect } from 'vitest';
import { repLabelFor, repOptionId } from '../salesRepLabel';

const reps = [{ id: 'rep-1', name: 'Rita Rep' }, { _id: 'rep-2', name: 'Sam Sales' }];

describe('repLabelFor', () => {
  it('resolves the name by id', () => {
    expect(repLabelFor('rep-1', reps)).toBe('Rita Rep');
  });
  it('resolves the name by _id', () => {
    expect(repLabelFor('rep-2', reps)).toBe('Sam Sales');
  });
  it('falls back to the 8-char id prefix when the rep is not in the list', () => {
    expect(repLabelFor('a0000000-0000-0000-0000-000000000003', reps)).toBe('a0000000');
  });
  it('reads Unassigned for a missing owner', () => {
    expect(repLabelFor(null, reps)).toBe('Unassigned');
    expect(repLabelFor(undefined, reps)).toBe('Unassigned');
    expect(repLabelFor('', reps)).toBe('Unassigned');
  });
});

describe('repOptionId', () => {
  it('prefers id and falls back to _id', () => {
    expect(repOptionId({ id: 'rep-1', name: 'Rita Rep' })).toBe('rep-1');
    expect(repOptionId({ id: '', _id: 'rep-2', name: 'Sam Sales' })).toBe('rep-2');
  });
});

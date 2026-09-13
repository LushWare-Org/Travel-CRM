import { describe, expect, it, vi } from 'vitest';
import {
  FAILED_ACTION_ANNOUNCEMENT,
  NO_PAGE_ANNOUNCEMENT,
  STALE_PAGE_ANNOUNCEMENT,
  runAssistantAction,
} from '../runAssistantAction';
import type { AssistantPageRegistration } from '../../capabilities/AssistantCapabilityProvider';

const registration = (overrides: Partial<AssistantPageRegistration> = {}): AssistantPageRegistration => ({
  surface: 'planner',
  revision: 'planner',
  pageContext: { surface: 'planner', revision: 'planner', step: 3 },
  actions: ['edit_day', 'regenerate_days'],
  runAction: vi.fn(async () => 'Updated Day 3: activities.'),
  ...overrides,
});

const EDIT_DAY = { dayNumber: 3, operation: 'add_activities', values: ['whale watching'] };

describe('runAssistantAction', () => {
  it('runs a valid action against the page and returns its line', async () => {
    const runAction = vi.fn(async () => 'Updated Day 3: activities.');
    const result = await runAssistantAction({
      registration: registration({ runAction }),
      tool: 'edit_day',
      args: EDIT_DAY,
      revision: 'planner',
    });

    expect(result).toEqual({ executed: true, announcement: 'Updated Day 3: activities.' });
    expect(runAction).toHaveBeenCalledWith({ tool: 'edit_day', ...EDIT_DAY });
  });

  it('refuses an action when no page registered anything', async () => {
    const result = await runAssistantAction({ registration: null, tool: 'edit_day', args: EDIT_DAY, revision: null });

    expect(result).toEqual({ executed: false, reason: 'no_page', announcement: NO_PAGE_ANNOUNCEMENT });
  });

  it('refuses an action chosen against a page that has since been replaced', async () => {
    const runAction = vi.fn(async () => 'never');
    const result = await runAssistantAction({
      registration: registration({ revision: 'customize:p2', runAction }),
      tool: 'edit_day',
      args: EDIT_DAY,
      revision: 'customize:p1',
    });

    // The package swap mid-turn: the turn was composed against p1 and would
    // otherwise edit p2's itinerary.
    expect(result).toEqual({ executed: false, reason: 'stale_revision', announcement: STALE_PAGE_ANNOUNCEMENT });
    expect(runAction).not.toHaveBeenCalled();
  });

  it('refuses an action the page did not register', async () => {
    const runAction = vi.fn(async () => 'never');
    const result = await runAssistantAction({
      registration: registration({ actions: ['regenerate_days'], runAction }),
      tool: 'edit_day',
      args: EDIT_DAY,
      revision: 'planner',
    });

    expect(result).toEqual({ executed: false, reason: 'unoffered', announcement: FAILED_ACTION_ANNOUNCEMENT });
    expect(runAction).not.toHaveBeenCalled();
  });

  it('refuses an action whose arguments fail the shared contract', async () => {
    const runAction = vi.fn(async () => 'never');
    const result = await runAssistantAction({
      registration: registration({ runAction }),
      tool: 'edit_day',
      args: { dayNumber: 3, operation: 'delete_day', values: ['x'] },
      revision: 'planner',
    });

    expect(result).toEqual({ executed: false, reason: 'invalid', announcement: FAILED_ACTION_ANNOUNCEMENT });
    expect(runAction).not.toHaveBeenCalled();
  });

  it('strips an argument the contract does not know and still runs', async () => {
    const runAction = vi.fn(async () => 'ok');
    const result = await runAssistantAction({
      registration: registration({ runAction }),
      tool: 'edit_day',
      args: { ...EDIT_DAY, colour: 'red' },
      revision: 'planner',
    });

    expect(result.executed).toBe(true);
    expect(runAction).toHaveBeenCalledWith({ tool: 'edit_day', ...EDIT_DAY });
  });

  it('reports a throwing page as a failed action rather than propagating', async () => {
    const runAction = vi.fn(async () => {
      throw new Error('page exploded');
    });
    const result = await runAssistantAction({
      registration: registration({ runAction }),
      tool: 'edit_day',
      args: EDIT_DAY,
      revision: 'planner',
    });

    expect(result).toEqual({ executed: false, reason: 'failed', announcement: FAILED_ACTION_ANNOUNCEMENT });
  });

  it('says nothing when the page reports a silent action', async () => {
    const result = await runAssistantAction({
      registration: registration({ actions: ['go_to_step'], runAction: vi.fn(async () => '') }),
      tool: 'go_to_step',
      args: { step: 3 },
      revision: 'planner',
    });

    expect(result).toEqual({ executed: true, announcement: '' });
  });
});

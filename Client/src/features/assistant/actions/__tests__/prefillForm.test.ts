import { describe, expect, it, vi } from 'vitest';
import { resolveHeldPrefill, runAssistantAction } from '../runAssistantAction';
import type { AssistantFormFieldState, AssistantPageRegistration } from '../../capabilities/AssistantCapabilityProvider';

const field = (value: string | number, source: AssistantFormFieldState['source']): AssistantFormFieldState => ({
  value,
  source,
});

const registrationFor = (fields: Record<string, AssistantFormFieldState>, form = 'contact') => {
  const write = vi.fn();
  const registration: AssistantPageRegistration = {
    surface: form as AssistantPageRegistration['surface'],
    revision: form,
    pageContext: { surface: form as AssistantPageRegistration['surface'], revision: form, step: 1 },
    actions: ['prefill_form'],
    prefill: { form: form as AssistantPageRegistration['surface'], fields: () => fields, write },
  };
  return { registration, write };
};

const fill = (fields: Record<string, string | number>) => ({ tool: 'prefill_form', args: { form: 'contact', fields } });

describe('a form fill', () => {
  it('writes the fields the visitor gave and says which ones took them', async () => {
    const { registration, write } = registrationFor({ name: field('', 'empty'), email: field('', 'empty') });

    const outcome = await runAssistantAction({
      registration,
      tool: 'prefill_form',
      args: { form: 'contact', fields: { name: 'Ana', email: 'ana@example.com' } },
      revision: 'contact',
    });

    expect(write).toHaveBeenCalledWith({ name: 'Ana', email: 'ana@example.com' });
    expect(outcome.executed).toBe(true);
    expect(outcome.announcement).toBe('Filled in name and email.');
    expect(outcome.pending).toBeUndefined();
  });

  it('holds a field the visitor typed in, writes the rest, and reports what is waiting', async () => {
    const { registration, write } = registrationFor({
      name: field('Ana', 'visitor'),
      email: field('', 'empty'),
    });

    const outcome = await runAssistantAction({
      registration,
      tool: 'prefill_form',
      args: { form: 'contact', fields: { name: 'Ana Maria', email: 'ana@example.com' } },
      revision: 'contact',
    });

    // The visitor's own text is never overwritten without an answer.
    expect(write).toHaveBeenCalledWith({ email: 'ana@example.com' });
    expect(outcome.pending).toEqual({ form: 'contact', fields: { name: 'Ana Maria' } });
    expect(outcome.announcement).toBe('Filled in email. name already has your own text — replace it?');
  });

  it('does not treat the same value as a collision', async () => {
    const { registration, write } = registrationFor({ name: field('Ana', 'visitor') });

    const outcome = await runAssistantAction({
      registration,
      tool: 'prefill_form',
      args: { form: 'contact', fields: { name: 'Ana' } },
      revision: 'contact',
    });

    expect(write).toHaveBeenCalledWith({ name: 'Ana' });
    expect(outcome.pending).toBeUndefined();
  });

  it('corrects its own earlier value without asking', async () => {
    const { registration, write } = registrationFor({ name: field('Ana', 'assistant') });

    await runAssistantAction({
      registration,
      tool: 'prefill_form',
      args: { form: 'contact', fields: { name: 'Ana Maria' } },
      revision: 'contact',
    });

    expect(write).toHaveBeenCalledWith({ name: 'Ana Maria' });
  });

  it('refuses a fill for a form the page did not register, and a stale page', async () => {
    const { registration, write } = registrationFor({ name: field('', 'empty') });

    const otherForm = await runAssistantAction({
      registration,
      tool: 'prefill_form',
      args: { form: 'booking', fields: { name: 'Ana' } },
      revision: 'contact',
    });
    const stale = await runAssistantAction({
      registration,
      tool: 'prefill_form',
      args: { form: 'contact', fields: { name: 'Ana' } },
      revision: 'somewhere-else',
    });

    expect(write).not.toHaveBeenCalled();
    expect(otherForm.executed).toBe(false);
    expect(stale.executed).toBe(false);
    expect(stale.reason).toBe('stale_revision');
  });

  it('applies a held fill on "replace" and writes nothing on "keep mine"', async () => {
    const { registration, write } = registrationFor({ name: field('Ana', 'visitor') });

    const kept = resolveHeldPrefill({ registration, pending: { form: 'contact', fields: { name: 'Ana Maria' } }, choice: 'keep' });
    expect(write).not.toHaveBeenCalled();
    expect(kept.announcement).toContain('Kept your text');

    const replaced = resolveHeldPrefill({
      registration,
      pending: { form: 'contact', fields: { name: 'Ana Maria' } },
      choice: 'replace',
    });
    expect(write).toHaveBeenCalledWith({ name: 'Ana Maria' });
    expect(replaced.executed).toBe(true);
  });

  it('discards a held fill whose form is no longer mounted', () => {
    const { registration, write } = registrationFor({ name: field('Ana', 'visitor') });

    const outcome = resolveHeldPrefill({
      registration,
      pending: { form: 'booking', fields: { name: 'Ana Maria' } },
      choice: 'replace',
    });

    expect(write).not.toHaveBeenCalled();
    expect(outcome.reason).toBe('stale_revision');
  });
});

describe('the assistant never submits a form', () => {
  // The design states the invariant as a check, not a promise: the action union
  // declares no member whose effect is submission, and no client module in this
  // path reaches for a form's submit API.
  // Read through Vite rather than the filesystem: the Client's tsconfig has no
  // Node types, and these are the modules the prefill path actually runs.
  const sources = {
    ...import.meta.glob(['../runAssistantAction.ts', '../useAssistantFormPrefill.ts', '../../capabilities/AssistantCapabilityProvider.tsx'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
    ...import.meta.glob(
      [
        '../../../contact/ContactContainer.tsx',
        '../../../packages/components/BookingModal.tsx',
        '../../../packages/components/ReviewModal.tsx',
      ],
      { query: '?raw', import: 'default', eager: true },
    ),
  } as Record<string, string>;

  it('declares no action that submits', async () => {
    const { ASSISTANT_PAGE_ACTIONS } = await import('@travel-crm/contracts');

    expect(ASSISTANT_PAGE_ACTIONS.filter((name) => /submit|send_?form|apply/i.test(name))).toEqual([]);
  });

  it('reaches for no form submission API anywhere in the prefill path', () => {
    expect(Object.keys(sources).length).toBeGreaterThanOrEqual(6);

    for (const [path, contents] of Object.entries(sources)) {
      expect(contents, path).not.toMatch(/requestSubmit|\.submit\(\)|dispatchEvent\(\s*new Event\(\s*['"]submit/);
    }
  });
});

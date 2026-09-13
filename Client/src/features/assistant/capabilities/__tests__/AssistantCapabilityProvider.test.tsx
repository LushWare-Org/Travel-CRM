import { describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { AssistantCapabilityProvider, useAssistantCapabilities, useAssistantPageRegistration } from '../AssistantCapabilityProvider';
import type { AssistantPageRegistration } from '../AssistantCapabilityProvider';

const registration = (revision: string): AssistantPageRegistration => ({
  surface: 'planner',
  revision,
  pageContext: { surface: 'planner', revision, step: 1 },
  actions: ['edit_day'],
  runAction: vi.fn(async () => 'done'),
});

/** Reads the store the way the widget does — at send time, not during render. */
const Probe = ({ onRead }: { onRead: (read: () => AssistantPageRegistration | null) => void }) => {
  onRead(useAssistantCapabilities());
  return null;
};

const Page = ({ value }: { value: AssistantPageRegistration | null }) => {
  useAssistantPageRegistration(value);
  return null;
};

describe('AssistantCapabilityProvider', () => {
  it('reports nothing registered before a page registers', () => {
    let read!: () => AssistantPageRegistration | null;
    render(
      <AssistantCapabilityProvider>
        <Probe onRead={(getter) => { read = getter; }} />
      </AssistantCapabilityProvider>,
    );

    expect(read()).toBeNull();
  });

  it('reports the mounted page registration to the reader', () => {
    let read!: () => AssistantPageRegistration | null;
    const value = registration('planner');

    render(
      <AssistantCapabilityProvider>
        <Probe onRead={(getter) => { read = getter; }} />
        <Page value={value} />
      </AssistantCapabilityProvider>,
    );

    expect(read()).toBe(value);
    expect(read()?.actions).toEqual(['edit_day']);
  });

  it('clears the registration when the page unmounts', () => {
    let read!: () => AssistantPageRegistration | null;
    const view = render(
      <AssistantCapabilityProvider>
        <Probe onRead={(getter) => { read = getter; }} />
        <Page value={registration('planner')} />
      </AssistantCapabilityProvider>,
    );

    expect(read()).not.toBeNull();

    act(() => view.rerender(
      <AssistantCapabilityProvider>
        <Probe onRead={(getter) => { read = getter; }} />
      </AssistantCapabilityProvider>,
    ));

    // A registration that outlived its page would let a turn execute against
    // state that is no longer on screen.
    expect(read()).toBeNull();
  });

  it('replaces the registration when the page reports a different one', () => {
    let read!: () => AssistantPageRegistration | null;
    const view = render(
      <AssistantCapabilityProvider>
        <Probe onRead={(getter) => { read = getter; }} />
        <Page value={registration('customize:p1')} />
      </AssistantCapabilityProvider>,
    );

    expect(read()?.revision).toBe('customize:p1');

    act(() => view.rerender(
      <AssistantCapabilityProvider>
        <Probe onRead={(getter) => { read = getter; }} />
        <Page value={registration('customize:p2')} />
      </AssistantCapabilityProvider>,
    ));

    expect(read()?.revision).toBe('customize:p2');
  });
});

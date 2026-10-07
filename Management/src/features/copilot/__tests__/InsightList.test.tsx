import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import InsightList from '../InsightList';
import type { InsightBucket } from '../insightShared';
import type { ClaimSection } from '../types';
import { claim, setViewport } from './copilotTestUtils';

const LABELS: Record<ClaimSection, string> = {
  attention: 'Needs attention',
  changed: 'Changed',
  current_state: 'Current state',
  experienced_view: 'Experienced view',
};

const renderList = (buckets: InsightBucket[]) =>
  render(<InsightList buckets={buckets} labels={LABELS} sources={[]} announce={vi.fn()} />);

const band = (key: string) => document.querySelector<HTMLElement>(`[data-copilot-bucket="${key}"] h3`);

beforeEach(() => {
  setViewport({ desktop: false });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('InsightList — section bands', () => {
  it('fills the hoisted critical group with the destructive tone, and keeps its icon', () => {
    renderList([{ kind: 'critical', claims: [claim({ severity: 'critical' })] }]);

    const critical = band('critical');
    expect(critical).toHaveTextContent('Critical');
    expect(critical?.className).toContain('bg-destructive/10');
    expect(critical?.className).toContain('text-destructive');
    expect(critical?.querySelector('svg')).not.toBeNull();
  });

  it('gives Needs attention the warning tone: it is the section asking to be acted on', () => {
    renderList([{ kind: 'section', section: 'attention', claims: [claim({ severity: 'warning' })] }]);

    const attention = band('attention');
    expect(attention).toHaveTextContent('Needs attention');
    expect(attention?.className).toContain('bg-warning/10');
    expect(attention?.className).toContain('text-warning');
    // Attention is a section, not the critical band: it must not borrow that fill.
    expect(attention?.className).not.toContain('bg-destructive');
  });

  it('leaves every other section quiet', () => {
    renderList([{ kind: 'section', section: 'current_state', claims: [claim()] }]);

    const quiet = band('current_state');
    expect(quiet).toHaveTextContent('Current state');
    expect(quiet?.className).toContain('bg-foreground/15');
    expect(quiet?.className).not.toContain('bg-warning');
  });

  it('names each section from its own band, and separates the cards by gap', () => {
    renderList([{ kind: 'section', section: 'current_state', claims: [claim()] }]);

    const quiet = band('current_state');
    expect(quiet?.id).toBe('heading-current_state');

    const wrap = document.querySelector<HTMLElement>('[data-copilot-bucket="current_state"]');
    expect(wrap?.getAttribute('aria-labelledby')).toBe('heading-current_state');
    // The card is the boundary, so the list draws no hairline between findings.
    expect(wrap?.querySelector('div')?.className).toContain('space-y-2');
  });
});

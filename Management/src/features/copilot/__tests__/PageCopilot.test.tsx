import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import PageCopilot from '../PageCopilot';
import type { CopilotSectionApi } from '../ManagementContextCopilot';

// The real shell owns the session and its transport; this test owns only the
// grid the page mount produces, so the shell is replaced with a pass-through
// that hands the briefing renderer a stub api.
vi.mock('../ManagementContextCopilot', () => ({
  default: ({ children }: { children: (api: CopilotSectionApi) => ReactNode }) => (
    <>
      {children({
        session: {} as CopilotSectionApi['session'],
        open: true,
        scopeLabel: 'Leads',
      })}
    </>
  ),
}));

beforeEach(() => {
  // The page mount is a no-op unless the build-time flag is on (the same flag
  // `LeadDetailPane.test.tsx` stubs for its copilot assertions).
  vi.stubEnv('VITE_MANAGEMENT_COPILOT_ENABLED', 'true');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('PageCopilot — layout', () => {
  it("reserves the floating trigger's 72px under the content column at xl", () => {
    render(
      <PageCopilot pageKey="leads" scopeLabel="Leads" renderBriefing={() => null}>
        <button type="button">Row action</button>
      </PageCopilot>
    );

    // At `xl`+ the collapsed panel floats a labeled trigger over the bottom of
    // the content column; `xl:pb-[72px]` is what keeps a row action from
    // sitting under it. Dropping the class would silently reintroduce the
    // overlap, so the assertion belongs on the column itself.
    const contentColumn = screen.getByRole('button', { name: 'Row action' }).parentElement;
    expect(contentColumn?.className).toContain('xl:pb-[72px]');
  });
});

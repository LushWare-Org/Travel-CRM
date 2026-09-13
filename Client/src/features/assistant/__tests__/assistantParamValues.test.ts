import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFetchPackages = vi.hoisted(() => vi.fn());

vi.mock('../../../services/api/packages', () => ({
  fetchPackages: mockFetchPackages,
}));

import { loadAssistantParamValues, resetAssistantParamValuesCache } from '../assistantParamValues';

// The aggregation entry fields this module reads. `slug` is what every other
// destination link on the site puts in the URL, `name` is what a person says.
const destination = (overrides: Record<string, unknown> = {}) => ({
  slug: '',
  nameSlug: '',
  name: '',
  raw: '',
  ...overrides,
});

beforeEach(() => {
  mockFetchPackages.mockReset();
  resetAssistantParamValuesCache();
});

describe('loadAssistantParamValues', () => {
  it('derives the destination values the rest of the site already links with', async () => {
    mockFetchPackages.mockResolvedValue({
      destinations: [
        destination({ slug: 'uae', nameSlug: 'dubai', name: 'Dubai', raw: 'Dubai, UAE' }),
        destination({ slug: 'indonesia', nameSlug: 'bali', name: 'Bali', raw: 'Bali, Indonesia' }),
      ],
    });

    await expect(loadAssistantParamValues()).resolves.toEqual({
      packages: {
        destination: [
          { value: 'uae', label: 'Dubai' },
          { value: 'indonesia', label: 'Bali' },
        ],
      },
    });
  });

  it('fetches the catalogue once per visit', async () => {
    mockFetchPackages.mockResolvedValue({ destinations: [destination({ slug: 'uae', name: 'Dubai' })] });

    await loadAssistantParamValues();
    await loadAssistantParamValues();
    await loadAssistantParamValues();

    expect(mockFetchPackages).toHaveBeenCalledTimes(1);
  });

  it('deduplicates values and drops an entry with no usable slug at all', async () => {
    mockFetchPackages.mockResolvedValue({
      destinations: [
        destination({ slug: 'uae', name: 'Dubai' }),
        destination({ slug: 'uae', name: 'Dubai again' }),
        destination({ slug: '', nameSlug: '', name: 'Nowhere' }),
      ],
    });

    await expect(loadAssistantParamValues()).resolves.toEqual({
      packages: { destination: [{ value: 'uae', label: 'Dubai' }] },
    });
  });

  it('falls back to the name slug when the destination carries no slug', async () => {
    mockFetchPackages.mockResolvedValue({
      destinations: [destination({ slug: '', nameSlug: 'bali', name: 'Bali' })],
    });

    await expect(loadAssistantParamValues()).resolves.toEqual({
      packages: { destination: [{ value: 'bali', label: 'Bali' }] },
    });
  });

  it('returns no vocabulary when the catalogue has no destinations', async () => {
    mockFetchPackages.mockResolvedValue({ destinations: [] });

    await expect(loadAssistantParamValues()).resolves.toEqual({});
  });

  it('returns no vocabulary when the response carries no destinations array', async () => {
    mockFetchPackages.mockResolvedValue({});

    await expect(loadAssistantParamValues()).resolves.toEqual({});
  });

  it('never rejects the turn, and does not cache the failure', async () => {
    mockFetchPackages.mockRejectedValueOnce(new Error('network down'));

    // A dead catalogue request must not break the assistant: the turn goes out
    // without the vocabulary and the server falls back to the model's reading.
    await expect(loadAssistantParamValues()).resolves.toEqual({});

    // Not cached, so a single blip does not disable filtering for the visit.
    mockFetchPackages.mockResolvedValue({ destinations: [destination({ slug: 'uae', name: 'Dubai' })] });
    await expect(loadAssistantParamValues()).resolves.toEqual({
      packages: { destination: [{ value: 'uae', label: 'Dubai' }] },
    });
    expect(mockFetchPackages).toHaveBeenCalledTimes(2);
  });
});

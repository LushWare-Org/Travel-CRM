import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({ toDataURL: () => 'data:image/png;base64,fake' }),
}));

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));
vi.mock('axios', () => ({ default: { post: mockPost } }));

vi.mock('../../../../services/api.js', () => ({ API_BASE_URL: 'https://gateway.test/api/v1' }));

const { captureAllCharts, exportLeadAnalyticsPDF } = await import('../exportAnalytics.js');

function renderChartContainer() {
  const container = document.createElement('div');
  // Matches ChartContainer.jsx's real root className exactly.
  container.className = 'bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300';
  Object.defineProperty(container, 'offsetParent', { value: document.body, configurable: true });
  container.getBoundingClientRect = () => ({ width: 400, height: 300, top: 0, left: 0 });

  const chart = document.createElement('div');
  chart.className = 'recharts-wrapper';
  container.appendChild(chart);

  const title = document.createElement('h2');
  title.textContent = 'Revenue Trend';
  container.appendChild(title);

  document.body.appendChild(container);
  return container;
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('captureAllCharts selector', () => {
  it('finds a chart rendered inside a real ChartContainer (rounded-2xl, not the old rounded-lg selector)', async () => {
    renderChartContainer();

    const charts = await captureAllCharts();

    expect(charts).toHaveLength(1);
    expect(charts[0].title).toBe('Revenue Trend');
    expect(charts[0].imageData).toContain('data:image/png');
  });

  it('captures nothing when the page has no ChartContainer-shaped elements', async () => {
    const charts = await captureAllCharts();
    expect(charts).toEqual([]);
  });
});

describe('exportLeadAnalyticsPDF', () => {
  it('posts to the shared API_BASE_URL, not a locally-duplicated constant', async () => {
    renderChartContainer();
    mockPost.mockResolvedValue({ status: 200, headers: { 'content-type': 'application/pdf' }, data: new Blob(['pdf'], { type: 'application/pdf' }) });
    window.URL.createObjectURL = vi.fn(() => 'blob:fake');
    window.URL.revokeObjectURL = vi.fn();
    // jsdom attempts real navigation on <a>.click(); downloadPDF() uses that
    // to trigger a file save, which we don't want (or need) in a unit test.
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await exportLeadAnalyticsPDF({ timeRange: 'monthly', summaryMetrics: [] });

    expect(mockPost).toHaveBeenCalledWith(
      'https://gateway.test/api/v1/analytics/leads/export-pdf',
      expect.any(Object),
      expect.any(Object)
    );

    clickSpy.mockRestore();
  });
});

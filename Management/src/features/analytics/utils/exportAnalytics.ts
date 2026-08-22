/**
 * Analytics PDF Export Utility
 * Client-side utility to capture charts and export analytics as PDF
 */

import html2canvas from 'html2canvas';
import axios from 'axios';
import { API_BASE_URL } from '../../../services/api.js';

interface CapturedChart {
  title: string;
  imageData: string | null;
}

/**
 * Capture all visible charts from the current page
 */
async function captureAllCharts(): Promise<CapturedChart[]> {
  const charts: CapturedChart[] = [];

  // Target ChartContainer's Card root (data-slot="card", set by src/components/ui/card.tsx)
  // to capture full chart with legends. Semantic data-slot selector, not literal Tailwind
  // classes — those are a styling implementation detail that changes across the design
  // system migration (previously '.bg-white.rounded-2xl.border', which broke this exact
  // selector once ChartContainer moved onto the Card primitive).
  const chartContainers = document.querySelectorAll('[data-slot="card"]');

  const foundCharts = new Set<string>();

  for (let i = 0; i < chartContainers.length; i++) {
    const container = chartContainers[i] as HTMLElement;

    // Check if this container has a chart (recharts-wrapper or role="img")
    const hasChart = container.querySelector('.recharts-wrapper, [role="img"]');
    if (!hasChart) continue;

    // Skip if element is hidden or very small
    const rect = container.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 100 || container.offsetParent === null) {
      continue;
    }

    // Skip duplicates
    const key = `${Math.round(rect.top)}-${Math.round(rect.left)}-${Math.round(rect.width)}`;
    if (foundCharts.has(key)) continue;
    foundCharts.add(key);

    let title = `Chart ${charts.length + 1}`;

    try {
      // ChartContainer's title renders via CardTitle (data-slot="card-title"), a <div>
      // not a heading element - h2/h3/h4/[class*="title"] stay as a fallback for any
      // not-yet-migrated page adornment outside a Card.
      const titleEl = container.querySelector('[data-slot="card-title"], h2, h3, h4, [class*="title"]');

      if (titleEl?.textContent) {
        title = titleEl.textContent.trim();
      }

      // Capture the entire container including legends
      const canvas = await html2canvas(container, {
        backgroundColor: '#FFFFFF',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowHeight: container.scrollHeight,
      });

      const imageData = canvas.toDataURL('image/png', 0.95); // Use PNG for better quality with legends
      charts.push({
        title,
        imageData,
      });

      // Limit to 20 charts to avoid overwhelming the PDF
      if (charts.length >= 20) break;
    } catch (error: any) {
      console.warn(`Error capturing chart "${title}":`, error.message);
    }
  }

  console.log(`Successfully captured ${charts.length} charts`);
  return charts;
}

/**
 * Capture a chart element as canvas (JPEG for smaller size)
 */
async function captureChartAsCanvas(chartElement: HTMLElement | null): Promise<string | null> {
  if (!chartElement) return null;

  try {
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#FFFFFF',
      scale: 2,
      useCORS: true,
      logging: false,
      windowHeight: chartElement.scrollHeight,
    });

    // Convert to JPEG instead of PNG for smaller size (base64)
    return canvas.toDataURL('image/jpeg', 0.85); // 85% quality JPEG
  } catch (error) {
    console.error('Error capturing chart:', error);
    return null;
  }
}

interface ExportSummaryMetric {
  label: string;
  value: string | number;
}

/**
 * Build summary data from analytics metrics
 */
function buildSummaryData(metrics: ExportSummaryMetric[] = []) {
  return {
    data: metrics.map((m) => ({
      label: m.label,
      value: m.value?.toString() || '-',
    })),
  };
}

interface ExportOptions {
  timeRange?: string;
  summaryMetrics?: ExportSummaryMetric[];
}

/**
 * Export Lead Analytics as PDF
 * Automatically captures all visible charts from the page
 */
export async function exportLeadAnalyticsPDF(options: ExportOptions = {}) {
  const { timeRange = 'monthly', summaryMetrics = [] } = options;

  try {
    showExportProgress('Capturing charts...');

    const charts = await captureAllCharts();
    console.log(`Captured ${charts.length} charts`);

    showExportProgress('Generating PDF...');

    const requestPayload = {
      timeRange,
      chartsSvg: charts.map((c) => ({
        title: c.title,
        imageData: c.imageData,
        description: '',
      })),
      summaryData: buildSummaryData(summaryMetrics),
    };

    const response = await axios.post(`${API_BASE_URL}/analytics/leads/export-pdf`, requestPayload, {
      responseType: 'blob',
      timeout: 120000, // 120 second timeout for large files
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.data || response.data.size === 0) {
      throw new Error('Received empty PDF response');
    }

    if (response.data.type !== 'application/pdf' && !response.data.type.includes('pdf')) {
      console.warn(`Unexpected content type: ${response.data.type}`);
    }

    downloadPDF(response.data, `lead-analytics-${Date.now()}.pdf`);
    showExportSuccess('Lead analytics PDF downloaded successfully!');
  } catch (error: any) {
    console.error('Error exporting lead analytics:', {
      message: error.message,
      response: error.response?.status,
      data: error.response?.data,
      isNetworkError: !error.response,
    });
    const errorMsg = error.response?.data?.message || error.message || 'Failed to export analytics PDF. Please try again.';
    showExportError(errorMsg);
  }
}

/**
 * Export Billing Analytics as PDF
 */
export async function exportBillingAnalyticsPDF(options: ExportOptions = {}) {
  const { timeRange = 'monthly', summaryMetrics = [] } = options;

  try {
    showExportProgress('Capturing charts...');

    const charts = await captureAllCharts();

    showExportProgress('Generating PDF...');

    const requestPayload = {
      timeRange,
      chartsSvg: charts.map((c) => ({
        title: c.title,
        imageData: c.imageData,
        description: '',
      })),
      summaryData: buildSummaryData(summaryMetrics),
    };

    const response = await axios.post(`${API_BASE_URL}/analytics/billing/export-pdf`, requestPayload, {
      responseType: 'blob',
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.data || response.data.size === 0) {
      throw new Error('Received empty PDF response');
    }

    if (response.data.type !== 'application/pdf' && !response.data.type.includes('pdf')) {
      console.warn(`Unexpected content type: ${response.data.type}`);
    }

    downloadPDF(response.data, `billing-analytics-${Date.now()}.pdf`);
    showExportSuccess('Billing analytics PDF downloaded successfully!');
  } catch (error: any) {
    console.error('Error exporting billing analytics:', {
      message: error.message,
      response: error.response?.status,
      data: error.response?.data,
      isNetworkError: !error.response,
    });
    const errorMsg = error.response?.data?.message || error.message || 'Failed to export analytics PDF. Please try again.';
    showExportError(errorMsg);
  }
}

/**
 * Export User Analytics as PDF
 */
export async function exportUserAnalyticsPDF(options: ExportOptions = {}) {
  const { timeRange = 'monthly', summaryMetrics = [] } = options;

  try {
    showExportProgress('Capturing charts...');

    const charts = await captureAllCharts();
    console.log(`Captured ${charts.length} charts`);

    showExportProgress('Generating PDF...');

    const response = await axios.post(`${API_BASE_URL}/analytics/users/export-pdf`, {
      timeRange,
      chartsSvg: charts.map((c) => ({
        title: c.title,
        imageData: c.imageData,
        description: '',
      })),
      summaryData: buildSummaryData(summaryMetrics),
    }, {
      responseType: 'blob',
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.data || response.data.size === 0) throw new Error('Received empty PDF response');

    downloadPDF(response.data, `user-analytics-${Date.now()}.pdf`);
    showExportSuccess('User analytics PDF downloaded successfully!');
  } catch (error: any) {
    console.error('Error exporting user analytics:', { message: error.message, response: error.response?.status });
    const errorMsg = error.response?.data?.message || error.message || 'Failed to export analytics PDF. Please try again.';
    showExportError(errorMsg);
  }
}

/**
 * Export Package Analytics as PDF
 */
export async function exportPackageAnalyticsPDF(options: ExportOptions = {}) {
  const { timeRange = 'monthly', summaryMetrics = [] } = options;

  try {
    showExportProgress('Capturing charts...');

    const charts = await captureAllCharts();
    console.log(`Captured ${charts.length} charts`);

    showExportProgress('Generating PDF...');

    const response = await axios.post(`${API_BASE_URL}/analytics/packages/export-pdf`, {
      timeRange,
      chartsSvg: charts.map((c) => ({
        title: c.title,
        imageData: c.imageData,
        description: '',
      })),
      summaryData: buildSummaryData(summaryMetrics),
    }, {
      responseType: 'blob',
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.data || response.data.size === 0) throw new Error('Received empty PDF response');

    downloadPDF(response.data, `package-analytics-${Date.now()}.pdf`);
    showExportSuccess('Package analytics PDF downloaded successfully!');
  } catch (error: any) {
    console.error('Error exporting package analytics:', { message: error.message, response: error.response?.status });
    const errorMsg = error.response?.data?.message || error.message || 'Failed to export analytics PDF. Please try again.';
    showExportError(errorMsg);
  }
}

/**
 * Export Website Analytics as PDF
 */
export async function exportWebsiteAnalyticsPDF(options: ExportOptions = {}) {
  const { timeRange = 'monthly', summaryMetrics = [] } = options;

  try {
    showExportProgress('Capturing charts...');

    const charts = await captureAllCharts();
    console.log(`Captured ${charts.length} charts`);

    showExportProgress('Generating PDF...');

    const response = await axios.post(`${API_BASE_URL}/analytics/website/export-pdf`, {
      timeRange,
      chartsSvg: charts.map((c) => ({
        title: c.title,
        imageData: c.imageData,
        description: '',
      })),
      summaryData: buildSummaryData(summaryMetrics),
    }, {
      responseType: 'blob',
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.data || response.data.size === 0) throw new Error('Received empty PDF response');

    downloadPDF(response.data, `website-analytics-${Date.now()}.pdf`);
    showExportSuccess('Website analytics PDF downloaded successfully!');
  } catch (error: any) {
    console.error('Error exporting website analytics:', { message: error.message, response: error.response?.status });
    const errorMsg = error.response?.data?.message || error.message || 'Failed to export analytics PDF. Please try again.';
    showExportError(errorMsg);
  }
}

/**
 * Helper function to download PDF
 */
function downloadPDF(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * UI Helper: Show export progress
 */
function showExportProgress(message: string) {
  // This can be replaced with your toast notification system
  console.log(`[Export Progress] ${message}`);
}

/**
 * UI Helper: Show export success
 */
function showExportSuccess(message: string) {
  console.log(`[Export Success] ${message}`);
}

/**
 * UI Helper: Show export error
 */
function showExportError(message: string) {
  console.error(`[Export Error] ${message}`);
}

export { captureAllCharts, captureChartAsCanvas };

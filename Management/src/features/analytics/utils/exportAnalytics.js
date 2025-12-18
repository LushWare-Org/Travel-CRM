/**
 * Analytics PDF Export Utility
 * Client-side utility to capture charts and export analytics as PDF
 */

import html2canvas from 'html2canvas';
import axios from 'axios';

// API base URL - adjust if needed
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * Capture all visible charts from the current page
 * @returns {Promise<Array>} Array of chart data with images
 */
async function captureAllCharts() {
  const charts = [];
  
  // Target ChartContainer divs to capture full chart with legends
  const chartContainers = document.querySelectorAll('.bg-white.rounded-lg.border');
  
  let foundCharts = new Set();
  
  for (let i = 0; i < chartContainers.length; i++) {
    const container = chartContainers[i];
    
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
      // Get the title from ChartContainer's h2
      const titleEl = container.querySelector('h2, h3, h4, [class*="title"]');
      
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
    } catch (error) {
      console.warn(`Error capturing chart "${title}":`, error.message);
    }
  }

  console.log(`✅ Successfully captured ${charts.length} charts`);
  return charts;
}

/**
 * Capture a chart element as SVG/Canvas
 * @param {HTMLElement} chartElement - The chart container element
 * @returns {Promise<string>} Base64 encoded chart data (JPEG for smaller size)
 */
async function captureChartAsCanvas(chartElement) {
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

/**
 * Extract SVG from Recharts component
 * @param {HTMLElement} chartElement - The chart container
 * @returns {string} SVG string or null
 */
function extractSVGFromChart(chartElement) {
  if (!chartElement) return null;

  const svg = chartElement.querySelector('svg');
  if (!svg) return null;

  try {
    return svg.outerHTML;
  } catch (error) {
    console.error('Error extracting SVG:', error);
    return null;
  }
}

/**
 * Capture multiple charts from analytics dashboard
 * @param {Array<{element: HTMLElement, title: string, description?: string}>} chartConfigs
 * @returns {Promise<Array>} Array of chart data
 */
async function captureCharts(chartConfigs) {
  const charts = [];

  for (const config of chartConfigs) {
    try {
      const imageData = await captureChartAsCanvas(config.element);

      charts.push({
        title: config.title,
        imageData,
        description: config.description || '',
      });
    } catch (error) {
      console.error(`Error capturing chart "${config.title}":`, error);
    }
  }

  return charts;
}

/**
 * Build summary data from analytics metrics
 * @param {Array<{label: string, value: string|number}>} metrics
 * @returns {Object} Summary data
 */
function buildSummaryData(metrics = []) {
  return {
    data: metrics.map((m) => ({
      label: m.label,
      value: m.value?.toString() || '-',
    })),
  };
}

/**
 * Export Lead Analytics as PDF
 * Automatically captures all visible charts from the page
 * @param {Object} options
 * @param {string} options.timeRange - Time range filter
 * @param {Array} options.summaryMetrics - Summary statistics
 * @returns {Promise<void>}
 */
export async function exportLeadAnalyticsPDF(options = {}) {
  const { timeRange = 'monthly', summaryMetrics = [] } = options;

  try {
    // Show loading state
    showExportProgress('Capturing charts...');

    // Capture all charts automatically
    const charts = await captureAllCharts();
    console.log(`Captured ${charts.length} charts`);
    console.log('First chart sample:', charts[0] ? {
      title: charts[0].title,
      hasImageData: !!charts[0].imageData,
      imageDataLength: charts[0].imageData?.length,
      imageDataPreview: charts[0].imageData?.substring(0, 50)
    } : 'No charts');

    showExportProgress('Generating PDF...');

    // Send to backend
    const requestPayload = {
      timeRange,
      chartsSvg: charts.map((c) => ({
        title: c.title,
        imageData: c.imageData,
        description: '',
      })),
      summaryData: buildSummaryData(summaryMetrics),
    };

    console.log(`Sending request with ${requestPayload.chartsSvg.length} charts, payload size estimate: ~${JSON.stringify(requestPayload).length / 1024 / 1024}MB`);

    const response = await axios.post(`${API_BASE_URL}/analytics/leads/export-pdf`, requestPayload, {
      responseType: 'blob',
      timeout: 120000, // 120 second timeout for large files
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('PDF Response:', {
      status: response.status,
      contentType: response.headers['content-type'],
      dataSize: response.data.size,
      dataType: response.data.type,
    });
    
    // Verify we have a blob
    if (!response.data || response.data.size === 0) {
      throw new Error('Received empty PDF response');
    }

    // Verify it's actually a PDF
    if (response.data.type !== 'application/pdf' && !response.data.type.includes('pdf')) {
      console.warn(`⚠️ Unexpected content type: ${response.data.type}`);
    }

    // Download PDF
    downloadPDF(response.data, `lead-analytics-${Date.now()}.pdf`);
    showExportSuccess('Lead analytics PDF downloaded successfully!');
  } catch (error) {
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
 * @param {Object} options
 * @param {string} options.timeRange - Time range filter
 * @param {Array} options.summaryMetrics - Summary statistics
 * @returns {Promise<void>}
 */
export async function exportBillingAnalyticsPDF(options = {}) {
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

    console.log(`Sending request with ${requestPayload.chartsSvg.length} charts`);

    const response = await axios.post(`${API_BASE_URL}/analytics/billing/export-pdf`, requestPayload, {
      responseType: 'blob',
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('PDF Response:', {
      status: response.status,
      contentType: response.headers['content-type'],
      dataSize: response.data.size,
      dataType: response.data.type,
    });
    
    if (!response.data || response.data.size === 0) {
      throw new Error('Received empty PDF response');
    }

    if (response.data.type !== 'application/pdf' && !response.data.type.includes('pdf')) {
      console.warn(`⚠️ Unexpected content type: ${response.data.type}`);
    }

    downloadPDF(response.data, `billing-analytics-${Date.now()}.pdf`);
    showExportSuccess('Billing analytics PDF downloaded successfully!');
  } catch (error) {
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
 * @param {Object} options
 * @param {string} options.timeRange - Time range filter
 * @param {Array} options.summaryMetrics - Summary statistics
 * @returns {Promise<void>}
 */
export async function exportUserAnalyticsPDF(options = {}) {
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

    console.log('PDF Response:', { status: response.status, dataSize: response.data.size });
    if (!response.data || response.data.size === 0) throw new Error('Received empty PDF response');

    downloadPDF(response.data, `user-analytics-${Date.now()}.pdf`);
    showExportSuccess('User analytics PDF downloaded successfully!');
  } catch (error) {
    console.error('Error exporting user analytics:', { message: error.message, response: error.response?.status });
    const errorMsg = error.response?.data?.message || error.message || 'Failed to export analytics PDF. Please try again.';
    showExportError(errorMsg);
  }
}

/**
 * Export Package Analytics as PDF
 * @param {Object} options
 * @param {string} options.timeRange - Time range filter
 * @param {Array} options.summaryMetrics - Summary statistics
 * @returns {Promise<void>}
 */
export async function exportPackageAnalyticsPDF(options = {}) {
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

    console.log('PDF Response:', { status: response.status, dataSize: response.data.size });
    if (!response.data || response.data.size === 0) throw new Error('Received empty PDF response');

    downloadPDF(response.data, `package-analytics-${Date.now()}.pdf`);
    showExportSuccess('Package analytics PDF downloaded successfully!');
  } catch (error) {
    console.error('Error exporting package analytics:', { message: error.message, response: error.response?.status });
    const errorMsg = error.response?.data?.message || error.message || 'Failed to export analytics PDF. Please try again.';
    showExportError(errorMsg);
  }
}

/**
 * Export Website Analytics as PDF
 * @param {Object} options
 * @param {string} options.timeRange - Time range filter
 * @param {Array} options.summaryMetrics - Summary statistics
 * @returns {Promise<void>}
 */
export async function exportWebsiteAnalyticsPDF(options = {}) {
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

    console.log('PDF Response:', { status: response.status, dataSize: response.data.size });
    if (!response.data || response.data.size === 0) throw new Error('Received empty PDF response');

    downloadPDF(response.data, `website-analytics-${Date.now()}.pdf`);
    showExportSuccess('Website analytics PDF downloaded successfully!');
  } catch (error) {
    console.error('Error exporting website analytics:', { message: error.message, response: error.response?.status });
    const errorMsg = error.response?.data?.message || error.message || 'Failed to export analytics PDF. Please try again.';
    showExportError(errorMsg);
  }
}

/**
 * Helper function to download PDF
 * @param {Blob} blob - PDF blob data
 * @param {string} filename - Name for the downloaded file
 */
function downloadPDF(blob, filename) {
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
function showExportProgress(message) {
  // This can be replaced with your toast notification system
  console.log(`[Export Progress] ${message}`);
  // For now, we'll use a simple console log
  // In production, use your notification library (react-hot-toast, etc.)
}

/**
 * UI Helper: Show export success
 */
function showExportSuccess(message) {
  console.log(`[Export Success] ${message}`);
  // Use your notification library here
}

/**
 * UI Helper: Show export error
 */
function showExportError(message) {
  console.error(`[Export Error] ${message}`);
  // Use your notification library here
}

export { captureAllCharts, captureChartAsCanvas };

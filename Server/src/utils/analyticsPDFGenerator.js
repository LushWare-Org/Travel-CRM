/**
 * Analytics PDF Generator
 * Generates professional PDFs for analytics exports with Puppeteer
 * Color scheme: Black headers (#0C0C0C) with orange accents (#EA580C)
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';
import { BRANDING } from '../config/branding.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Path to logo in Management public folder
const LOGO_PATH = path.join(dirname, '../../../Management/public/website-logo-1.png');

// Color Scheme - Black and Orange Theme
const COLORS = {
  headerBg: '#0C0C0C', // Black
  headerText: '#FFFFFF', // White
  accent: '#EA580C', // Orange
  accentLight: '#F97316', // Light Orange
  primaryText: '#1F2937', // Dark Gray
  secondaryText: '#6B7280', // Medium Gray
  border: '#E5E7EB', // Light Gray
  background: '#FFFFFF', // White
  statBg: '#F9FAFB', // Off-white
};

// Helper to load logo
const loadLogo = () => {
  try {
    if (fs.existsSync(LOGO_PATH)) {
      return fs.readFileSync(LOGO_PATH).toString('base64');
    }
  } catch (error) {
    logger.warn('[Analytics PDF] Error loading logo:', error.message);
  }
  return null;
};

/**
 * Generate Analytics PDF
 * @param {Object} options - Configuration object
 * @param {string} options.analyticsType - Type of analytics (lead, billing, user, package, website)
 * @param {string} options.title - PDF title
 * @param {string} options.timeRange - Time range (daily, weekly, monthly, annual)
 * @param {Array} options.stats - Statistics data [{label, value, icon?}]
 * @param {Array} options.charts - Chart data [{title, svgData, description?}]
 * @param {Object} options.summary - Summary section data
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateAnalyticsPDF(options) {
  const {
    title = 'Analytics Report',
    timeRange = 'monthly',
    stats = [],
    charts = [],
    summary = {},
  } = options;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(30000); // 30 second timeout
    page.setDefaultNavigationTimeout(30000);
    await page.setViewport({ width: 1200, height: 800 });

    // Generate HTML content
    const htmlContent = generateHTMLTemplate({
      title,
      timeRange,
      stats,
      charts,
      summary,
    });

    logger.info(`[PDF Generator] Setting HTML content (${htmlContent.length} bytes)`);
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' }); // Changed from networkidle0

    logger.info('[PDF Generator] Rendering PDF...');
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: 15,
        right: 15,
        bottom: 15,
        left: 15,
      },
      printBackground: true,
    });

    logger.info(`[PDF Generator] ✅ PDF generated: ${pdfBuffer.length} bytes`);
    return pdfBuffer;
  } catch (error) {
    logger.error('Error generating analytics PDF:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate HTML Template for PDF
 */
function generateHTMLTemplate({
  title, timeRange, stats, charts, summary,
}) {
  const logoBase64 = loadLogo();
  const logoTag = logoBase64
    ? `<img src="data:image/png;base64,${logoBase64}" alt="${BRANDING.company.name}" style="height: 24px; margin-right: 8px;">`
    : '';

  const statsHTML = stats
    .map(
      (stat, idx) => `
    <div style="flex: 1; min-width: 150px; padding: 16px; background: ${COLORS.statBg}; border-radius: 8px; border-left: 4px solid ${COLORS.accent}; margin-right: ${idx < stats.length - 1 ? '12px' : '0'};">
      <div style="font-size: 12px; color: ${COLORS.secondaryText}; margin-bottom: 4px;">${stat.label}</div>
      <div style="font-size: 20px; font-weight: bold; color: ${COLORS.primaryText};">${stat.value}</div>
    </div>
  `,
    )
    .join('');

  // Organize charts in 2-column grid for better space utilization
  let chartsHTML = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">';

  charts.forEach((chart, idx) => {
    // Close current grid and start new one every 4 charts (2 rows of 2)
    if (idx > 0 && idx % 4 === 0) {
      chartsHTML += '</div><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; page-break-before: auto;">';
    }

    chartsHTML += `
      <div style="page-break-inside: avoid;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; color: ${COLORS.primaryText}; border-bottom: 2px solid ${COLORS.accent}; padding-bottom: 6px;">
          ${chart.title}
        </h3>
        ${chart.imageData ? `<div style="background: white; padding: 8px; border-radius: 6px; border: 1px solid ${COLORS.border};"><img src="${chart.imageData}" style="width: 100%; max-height: 280px; height: auto; object-fit: contain; display: block; border-radius: 4px;" /></div>` : ''}
        ${chart.description ? `<div style="font-size: 10px; color: ${COLORS.secondaryText}; margin-top: 6px;">${chart.description}</div>` : ''}
      </div>
    `;
  });

  chartsHTML += '</div>';

  const summaryHTML = summary.data
    ? `
    <div style="margin-top: 24px; padding: 16px; background: ${COLORS.statBg}; border-radius: 8px; border-left: 4px solid ${COLORS.accent};">
      <h3 style="margin: 0 0 12px 0; color: ${COLORS.primaryText};">Summary</h3>
      ${summary.data.map((item) => `<div style="font-size: 12px; color: ${COLORS.primaryText}; margin-bottom: 6px;"><strong>${item.label}:</strong> ${item.value}</div>`).join('')}
    </div>
  `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: ${COLORS.primaryText};
          line-height: 1.6;
        }
        .header {
          background: ${COLORS.headerBg};
          color: ${COLORS.headerText};
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          border-radius: 8px;
        }
        .header-left {
          display: flex;
          align-items: center;
        }
        .header-content h1 {
          font-size: 24px;
          margin-bottom: 4px;
        }
        .header-content p {
          font-size: 12px;
          opacity: 0.8;
        }
        .header-right {
          text-align: right;
        }
        .time-range {
          display: inline-block;
          background: ${COLORS.accent};
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .export-date {
          font-size: 11px;
          opacity: 0.8;
        }
        .stats-container {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }
        .stat-card {
          flex: 1;
          min-width: 150px;
          padding: 16px;
          background: ${COLORS.statBg};
          border-radius: 8px;
          border-left: 4px solid ${COLORS.accent};
        }
        .stat-label {
          font-size: 12px;
          color: ${COLORS.secondaryText};
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 20px;
          font-weight: bold;
          color: ${COLORS.primaryText};
        }
        .chart-section {
          page-break-inside: avoid;
          margin-bottom: 24px;
        }
        .chart-title {
          margin-bottom: 12px;
          font-size: 16px;
          color: ${COLORS.primaryText};
          border-bottom: 2px solid ${COLORS.accent};
          padding-bottom: 8px;
        }
        .chart-container {
          background: white;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid ${COLORS.border};
        }
        .summary-section {
          margin-top: 24px;
          padding: 16px;
          background: ${COLORS.statBg};
          border-radius: 8px;
          border-left: 4px solid ${COLORS.accent};
        }
        .summary-title {
          margin-bottom: 12px;
          color: ${COLORS.primaryText};
          font-weight: bold;
        }
        .summary-item {
          font-size: 12px;
          color: ${COLORS.primaryText};
          margin-bottom: 6px;
        }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid ${COLORS.border};
          text-align: center;
          font-size: 10px;
          color: ${COLORS.secondaryText};
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="header-left">
          ${logoTag}
          <div class="header-content">
            <h1>${title}</h1>
            <p>${BRANDING.company.name} Analytics</p>
          </div>
        </div>
        <div class="header-right">
          <div class="time-range">${timeRange.toUpperCase()}</div>
          <div class="export-date">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <!-- Statistics -->
      ${stats.length > 0 ? `<div class="stats-container">${statsHTML}</div>` : ''}

      <!-- Charts -->
      ${chartsHTML}

      <!-- Summary -->
      ${summaryHTML}

      <!-- Footer -->
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${BRANDING.company.name}. All rights reserved. | Confidential Analytics Report</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Convert SVG to PNG for better PDF rendering
 * @param {string} svgString - SVG content as string
 * @returns {Promise<string>} Base64 encoded PNG data
 */
async function convertSVGToImage(svgString) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // Wrap SVG in HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          svg { display: block; }
        </style>
      </head>
      <body>
        ${svgString}
      </body>
      </html>
    `;

    await page.setContent(html);
    const screenshot = await page.screenshot({ encoding: 'base64', type: 'png' });
    return `data:image/png;base64,${screenshot}`;
  } catch (error) {
    logger.error('Error converting SVG to image:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export { generateAnalyticsPDF, convertSVGToImage };

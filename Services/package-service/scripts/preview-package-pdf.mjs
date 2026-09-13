#!/usr/bin/env node
// Dev tool: renders a sample package PDF from fixture data and (if
// pdftoppm/poppler-utils is installed) rasterizes it to PNGs for visual
// review of layout/branding changes — pdfkit's compressed content streams
// aren't otherwise inspectable without actually rendering the pages.
//
// Usage: node scripts/preview-package-pdf.mjs [outDir]
// outDir defaults to a system temp directory (nothing under this repo).

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generatePackagePDF } from '../src/utils/packagePDFGenerator.js';

const outDir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'package-pdf-preview-'));
fs.mkdirSync(outDir, { recursive: true });

// Stubs the user-service org-settings call so this doesn't depend on that
// service being up, and so letterhead branding fields can be tuned here.
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({
    status: 'success',
    data: {
      settings: {
        companyName: 'Travel CRM',
        tagline: 'Your Travel Partner',
        ratingTagline: 'Rated 4.9  |  10k+ Travellers  |  30+ Destinations',
        logoUrl: '',
        companyAddress: '42 Beach Road, Colombo 03, Sri Lanka',
        contactPhone: '+94 11 234 5678',
        contactEmail: 'hello@travelcrm.example',
        website: 'https://www.travelcrm.example',
      },
    },
  }),
});

const dayTitles = ['Arrival in Kyoto', 'Fushimi Inari & Gion', 'Arashiyama Bamboo Grove', 'Nara Day Trip', 'Departure'];
const days = dayTitles.map((title, i) => ({
  id: `day-${i + 1}`,
  dayNumber: i + 1,
  title,
  description: 'A full day exploring the region with a private guide, blending culture, cuisine, and scenery.',
  breakfastCount: 1,
  lunchCount: i % 2,
  dinnerCount: 1,
  places: [
    { place: { name: 'Kyoto Station' }, customName: null },
    { place: null, customName: 'Old Town Quarter' },
  ],
  activities: [
    { activity: { name: 'Guided Walking Tour', description: 'A local guide walks you through the historic district.' } },
    { activity: { name: 'Tea Ceremony', description: null } },
  ],
  transports: [{ transportMode: 'PRIVATE_CAR', pricingModel: 'PER_VEHICLE' }],
}));

const pkg = {
  id: 'preview-pkg-1',
  title: 'Japan Cultural Journey',
  description:
    "An immersive week exploring Japan's temples, gardens, and cuisine, guided by local experts from Kyoto to Nara.",
  destination: 'Japan',
  durationDays: days.length,
  category: 'CULTURAL',
  coverImage: null,
  inclusions: ['Daily breakfast', 'Airport transfers', 'English-speaking guide', 'All entrance fees'],
  exclusions: ['International airfare', 'Travel insurance', 'Personal expenses'],
  termsAndConditions:
    'Rates are subject to availability at the time of confirmed booking. Itinerary order may vary slightly depending on local conditions.',
  basePrice: 2450,
  currency: 'USD',
  itineraryDays: days,
};

const buffer = await generatePackagePDF(pkg);
const pdfPath = path.join(outDir, 'package-preview.pdf');
fs.writeFileSync(pdfPath, buffer);
console.log(`Wrote ${pdfPath} (${buffer.length} bytes)`);

try {
  execFileSync('pdftoppm', ['-png', '-r', '150', pdfPath, path.join(outDir, 'page')]);
  console.log(`Rendered pages to ${outDir}/page-*.png`);
} catch {
  console.log('pdftoppm not available — skipped PNG rendering, PDF is still at the path above.');
}

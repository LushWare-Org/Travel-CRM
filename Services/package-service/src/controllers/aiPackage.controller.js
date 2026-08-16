import slugify from 'slugify';
import { ROUTE_TYPE, PRICING_MODEL } from '../../../shared/constants/src/index.js';
import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import logger from '../config/logger.js';
import { serializePackage, resolveActivityCatalogIds, buildItineraryDaysData, buildInclude } from '../services/package.service.js';
import { generateStructured } from '../ai/geminiClient.js';
import { buildGeneratePackagePrompt, generatePackageResponseSchema } from '../ai/prompts/generatePackage.v1.js';
import { buildGenerateFromTitlePrompt, generateFromTitleResponseSchema } from '../ai/prompts/generateFromTitle.v1.js';
import { buildPackageMarketingContentPrompt, packageMarketingContentResponseSchema } from '../ai/prompts/packageMarketingContent.v1.js';

// Map frontend display categories to valid PackageCategory enum values.
const CATEGORY_MAP = {
  adventure: 'FAMILY', budget: 'FAMILY', luxury: 'FAMILY',
  religious: 'FAMILY', wildlife: 'WILD_SAFARI', beach: 'FAMILY',
  heritage: 'FAMILY', other: 'FAMILY', honeymoon: 'HONEYMOON',
  couple: 'COUPLE', family: 'FAMILY', group: 'GROUP',
  'wild safari': 'WILD_SAFARI',
};
const toValidCategory = (category) => CATEGORY_MAP[String(category || 'family').toLowerCase()] || 'FAMILY';

const toUpperCategory = (cat) => {
  const m = CATEGORY_MAP[cat?.toLowerCase()];
  return m || 'FAMILY';
};

function mapTransportMode(transport) {
  const t = (transport || '').toLowerCase();
  if (t.includes('flight') || t.includes('plane')) return 'FLIGHT';
  if (t.includes('train') || t.includes('rail')) return 'TRAIN';
  if (t.includes('boat') || t.includes('ferry') || t.includes('speedboat')) return 'BOAT';
  if (t.includes('van') || t.includes('bus') || t.includes('coach')) return 'VAN';
  return 'CAR';
}

// AI response shape (locations/activities as plain name strings, meals as
// booleans) → the canonical itineraryDay shape the rest of the app already
// knows how to persist (same shape the manual package editor submits).
function normalizeAIDays(aiDays) {
  return aiDays.map((day, i) => ({
    dayNumber: day.dayNumber || i + 1,
    title: day.title,
    description: day.description,
    breakfastCount: day.meals?.breakfast ? 1 : 0,
    lunchCount: day.meals?.lunch ? 1 : 0,
    dinnerCount: day.meals?.dinner ? 1 : 0,
    places: (day.locations || []).map((loc, j) => ({ customName: loc, orderIndex: j })),
    activities: (day.activities || []).map((name, j) => ({ name, orderIndex: j })),
    transports: day.transport ? [{
      routeType: ROUTE_TYPE.DAILY_ROUTING,
      transportMode: mapTransportMode(day.transport),
      pricingModel: PRICING_MODEL.PER_VEHICLE,
      unitCost: 0, // AI cannot price transport — admin fills in during review
    }] : [],
  }));
}

// ── Shared helper ─────────────────────────────────────────────

async function buildAIContent(pkg) {
  const prompt = buildPackageMarketingContentPrompt({
    title: pkg.title,
    destination: pkg.destination,
    durationDays: pkg.durationDays,
    category: pkg.category,
  });
  return generateStructured({ prompt, schema: packageMarketingContentResponseSchema });
}

// ── Create a full package + itinerary days from scratch ───────

export const generateAIPackage = asyncHandler(async (req, res) => {
  const { destination, duration, budget, travelers, preferences, description, packageType } = req.body;
  const category = toValidCategory(req.body.category);

  const prompt = buildGeneratePackagePrompt({
    destination,
    duration,
    category,
    packageType,
    budget,
    travelers,
    // The dialog's free-text field is called "description" on the wire —
    // it's what actually drives itinerary customization, so it must reach the prompt.
    preferences: preferences || description,
  });

  // A fixed token budget doesn't scale with the day count — a long itinerary's
  // full JSON (locations/activities/meals/transport × N days) can exceed a
  // small fixed cap and get silently truncated by Gemini's constrained
  // decoder. Scale with duration instead, capped under the model's real
  // ceiling (65536); geminiClient escalates further on its own if this still
  // isn't enough.
  const maxOutputTokens = Math.min(60000, 1500 + Number(duration) * 700);
  const packageData = await generateStructured({ prompt, schema: generatePackageResponseSchema, maxOutputTokens });

  const { days: aiDays, ...pkgBody } = packageData;
  const d = Number(duration);
  const days = Array.isArray(aiDays) ? aiDays.slice(0, d) : [];

  // Last-resort safety net for a model that returns a handful fewer days than
  // asked without tripping truncation detection upstream — pad to the exact
  // count so the editor always shows the requested day grid.
  const shortfall = d - days.length;
  while (days.length < d) {
    const n = days.length + 1;
    days.push({ dayNumber: n, title: `Day ${n}`, description: '', locations: [], activities: [], meals: { breakfast: true, dinner: true }, transport: '' });
  }
  if (shortfall > 0) {
    logger.warn({ destination, requestedDuration: d, shortfall }, 'AI returned fewer days than requested — padded with blank placeholder days');
  }

  const normalizedDays = normalizeAIDays(days);
  const { days: resolvedDays } = await resolveActivityCatalogIds(normalizedDays);

  const slug = slugify(pkgBody.title || packageData.title || 'package', { lower: true, strict: true }) + '-' + Date.now();

  const pkg = await prisma.package.create({
    data: {
      title: pkgBody.title || packageData.title || 'AI Generated Package',
      description: pkgBody.description || '',
      destination: pkgBody.destination || destination,
      durationDays: d,
      category: toUpperCategory(pkgBody.category || category),
      slug,
      coverImage: pkgBody.coverImage || null,
      inclusions: pkgBody.inclusions || [],
      exclusions: pkgBody.exclusions || [],
      termsAndConditions: pkgBody.termsAndConditions || '',
      basePrice: pkgBody.price || 0,
      defaultMarginType: 'PERCENTAGE',
      defaultMarginInput: 20,
      currency: 'USD',
      isActive: false,
      isFeatured: false,
      createdBy: req.user.id,
      itineraryDays: { create: buildItineraryDaysData(resolvedDays) },
    },
    include: buildInclude(),
  });

  res.status(201).json({ success: true, data: serializePackage(pkg) });
});

// ── Generate content from title — does NOT create anything ────

export const generateContentFromTitle = asyncHandler(async (req, res) => {
  const { title, destination, duration, category } = req.body;

  const prompt = buildGenerateFromTitlePrompt({ title, destination, duration, category });
  const content = await generateStructured({ prompt, schema: generateFromTitleResponseSchema });

  res.json({ success: true, data: content });
});

// ── Generate AI content for existing package and save it ──────

export const generateAndSaveAIContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) throw new AppError('Package not found', 404);

  const content = await buildAIContent(pkg);

  const updated = await prisma.package.update({
    where: { id },
    data: {
      description: content.description,
      inclusions: content.inclusions || [],
      exclusions: content.exclusions || [],
      termsAndConditions: content.termsAndConditions || '',
    },
    include: {
      images: { orderBy: { orderIndex: 'asc' } },
      itineraryDays: { orderBy: { dayNumber: 'asc' }, include: { places: true, activities: true, transports: true } },
    },
  });

  res.json({ success: true, data: serializePackage(updated) });
});

// ── Preview AI content for existing package — does NOT save ───

export const previewAIContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) throw new AppError('Package not found', 404);

  const content = await buildAIContent(pkg);
  res.json({ success: true, data: content });
});

import { GoogleGenerativeAI } from '@google/generative-ai';
import slugify from 'slugify';
import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { serializePackage } from '../services/package.service.js';

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

// Map AI-generated legacy day shape → relational ItineraryDay rows.
function mapDaysToRelational(normalizedDays) {
  return normalizedDays.map((day, i) => ({
    dayNumber: day.dayNumber || (i + 1),
    title: day.title,
    description: day.description,
    breakfastCount: day.meals?.breakfast ? 1 : 0,
    lunchCount: day.meals?.lunch ? 1 : 0,
    dinnerCount: day.meals?.dinner ? 1 : 0,
    places: {
      create: (day.locations || []).map((loc, j) => ({
        customName: loc,
        orderIndex: j,
      })),
    },
    activities: {
      create: (day.activities || []).map((name, j) => ({
        orderIndex: j,
        // ActivityCatalog reference resolved by name later if needed; for AI draft,
        // activities are created inline via a fallback — controller just stores the name.
      })),
    },
    transports: day.transport ? {
      create: [{
        routeType: 'DAILY_ROUTING',
        transportMode: mapTransportMode(day.transport),
        pricingModel: 'PER_VEHICLE',
        unitCost: 0, // AI cannot price — admin fills later
      }],
    } : undefined,
  }));
}

function mapTransportMode(transport) {
  const t = (transport || '').toLowerCase();
  if (t.includes('flight') || t.includes('plane')) return 'FLIGHT';
  if (t.includes('train') || t.includes('rail')) return 'TRAIN';
  if (t.includes('boat') || t.includes('ferry') || t.includes('speedboat')) return 'BOAT';
  if (t.includes('van') || t.includes('bus') || t.includes('coach')) return 'VAN';
  return 'CAR';
}

// ── Shared helper ─────────────────────────────────────────────

async function buildAIContent(pkg) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const prompt = `Generate compelling marketing content for a travel package with these details:
  Title: "${pkg.title || 'Travel Package'}"
  Destination: ${pkg.destination || 'Exotic destination'}
  Duration: ${pkg.durationDays || '?'} days
  Category: ${pkg.category || 'FAMILY'}

  Return ONLY a JSON object (no markdown, no extra text):
  {
    "description": "2-3 engaging sentences about the package experience",
    "inclusions": ["5-8 items included in the package"],
    "exclusions": ["4-6 items not included"],
    "termsAndConditions": "3-5 concise terms and conditions as a string"
  }`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let content;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    content = match ? JSON.parse(match[0]) : null;
  } catch {
    throw new AppError('Failed to parse AI response', 500);
  }
  if (!content) throw new AppError('AI did not return valid content', 500);
  return content;
}

// ── Create a full package + itinerary days from scratch ───────

export const generateAIPackage = asyncHandler(async (req, res) => {
  const { destination, duration, budget, travelers, preferences } = req.body;
  const category = toValidCategory(req.body.category);

  if (!destination || !duration) throw new AppError('destination and duration are required', 400);
  if (!process.env.GEMINI_API_KEY) throw new AppError('AI package generation not configured', 503);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
  });

  const prompt = `You are an expert travel package designer. Generate a complete travel package for ${destination} for exactly ${duration} days. Category: ${category}. Budget: ${budget || 'moderate'}. Travelers: ${travelers || 2}. Preferences: ${preferences || 'general sightseeing'}.

CRITICAL INSTRUCTIONS:
1. Respond with ONLY a valid JSON object — no markdown code fences, no text before or after.
2. The "days" array MUST contain exactly ${duration} entries, one per day, numbered 1 to ${duration}. Do not stop early or summarize remaining days.
3. Each day must include "locations" (array of place names) and "activities" (array of activity names).

Return a JSON object with these exact fields:
{
  "title": "Package title",
  "description": "2-3 sentence description",
  "destination": "${destination}",
  "durationDays": ${duration},
  "price": number,
  "category": "${category}",
  "inclusions": ["array", "of", "inclusions"],
  "exclusions": ["array", "of", "exclusions"],
  "days": [
    {
      "dayNumber": 1,
      "title": "Day title",
      "description": "Day description",
      "locations": ["location1", "location2"],
      "activities": ["activity1", "activity2"],
      "meals": {"breakfast": true, "lunch": true, "dinner": true},
      "transport": "car"
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let packageData;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    packageData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    packageData = null;
  }
  if (!packageData) throw new AppError('AI did not return valid package data', 500);

  const { days: aiDays, ...pkgBody } = packageData;
  const d = Number(duration);
  const days = Array.isArray(aiDays) ? aiDays.slice(0, d) : [];

  // Pad to exactly `duration` days
  while (days.length < d) {
    const n = days.length + 1;
    days.push({ dayNumber: n, title: `Day ${n}`, description: '', locations: [], activities: [], meals: { breakfast: true, dinner: true }, transport: '' });
  }

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
      itineraryDays: { create: mapDaysToRelational(days) },
    },
    include: {
      images: true,
      itineraryDays: {
        orderBy: { dayNumber: 'asc' },
        include: {
          places: { orderBy: { orderIndex: 'asc' } },
          activities: { orderBy: { orderIndex: 'asc' } },
          transports: true,
        },
      },
    },
  });

  res.status(201).json({ success: true, data: serializePackage(pkg) });
});

// ── Generate content from title — does NOT create anything ────

export const generateContentFromTitle = asyncHandler(async (req, res) => {
  const { title, destination, duration, category } = req.body;
  if (!title) throw new AppError('title is required', 400);
  if (!process.env.GEMINI_API_KEY) throw new AppError('AI not configured', 503);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const contextParts = [
    destination ? `to ${destination}` : null,
    duration    ? `(${duration} days)` : null,
    category    ? `in the ${category} category` : null,
  ].filter(Boolean).join(' ');

  const prompt = `Generate marketing content for a travel package titled "${title}"${contextParts ? ' ' + contextParts : ''}.

Return ONLY a JSON object (no markdown):
{
  "description": "2-3 engaging sentences about the experience",
  "highlights": ["4-6 unique package highlights as short phrases"],
  "inclusions": ["5-8 items included"],
  "exclusions": ["4-6 items not included"],
  "termsAndConditions": "3-5 key terms and conditions as a string"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let content;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    content = match ? JSON.parse(match[0]) : null;
  } catch {
    throw new AppError('Failed to parse AI response', 500);
  }
  if (!content) throw new AppError('AI did not return valid content', 500);

  res.json({ success: true, data: content });
});

// ── Generate AI content for existing package and save it ──────

export const generateAndSaveAIContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) throw new AppError('Package not found', 404);
  if (!process.env.GEMINI_API_KEY) throw new AppError('AI not configured', 503);

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
  if (!process.env.GEMINI_API_KEY) throw new AppError('AI not configured', 503);

  const content = await buildAIContent(pkg);
  res.json({ success: true, data: content });
});

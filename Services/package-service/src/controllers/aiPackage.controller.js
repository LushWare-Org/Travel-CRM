import { GoogleGenerativeAI } from '@google/generative-ai';
import slugify from 'slugify';
import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// Frontend exposes more display categories than the PackageCategory enum supports;
// map down to a valid value (mirrors Server/src/services/aiPackageGeneration.service.js).
const CATEGORY_MAP = {
  adventure: 'family',
  budget: 'family',
  luxury: 'family',
  religious: 'family',
  wildlife: 'wild safari',
  beach: 'family',
  heritage: 'family',
  other: 'family',
  honeymoon: 'honeymoon',
  couple: 'couple',
  family: 'family',
  group: 'group',
  'wild safari': 'wild safari',
};
const toValidCategory = (category) => CATEGORY_MAP[String(category || 'family').toLowerCase()] || 'family';

const placeholderDay = (dayNumber) => ({
  dayNumber,
  title: `Day ${dayNumber}`,
  description: '',
  locations: [],
  activities: [],
  accommodation: { name: '', address: '', contactNumber: '', rating: 0, type: 'hotel' },
  meals: { breakfast: true, lunch: false, dinner: true },
  transport: '',
  places: [],
  images: [],
  notes: '',
});

// Guarantees exactly `duration` fully-shaped day entries — the AI is asked for this,
// but Gemini can under-generate or truncate on longer itineraries, so pad/normalize
// rather than let a short array or missing sub-field reach the client as-is.
const normalizeDays = (days, duration) => {
  const source = Array.isArray(days) ? days : [];
  const result = [];
  for (let i = 0; i < duration; i += 1) {
    const dayNumber = i + 1;
    const day = source[i];
    if (!day) {
      result.push(placeholderDay(dayNumber));
      continue;
    }
    result.push({
      dayNumber: day.dayNumber || dayNumber,
      title: day.title || `Day ${dayNumber}`,
      description: day.description || '',
      locations: Array.isArray(day.locations) ? day.locations : [],
      activities: Array.isArray(day.activities) ? day.activities : [],
      accommodation: {
        name: day.accommodation?.name || '',
        address: day.accommodation?.address || '',
        contactNumber: day.accommodation?.contactNumber || day.accommodation?.contact || '',
        rating: day.accommodation?.rating !== undefined && day.accommodation?.rating !== null
          ? parseFloat(day.accommodation.rating) || 0
          : 0,
        type: day.accommodation?.type || 'hotel',
      },
      meals: {
        breakfast: day.meals?.breakfast === true,
        lunch: day.meals?.lunch === true,
        dinner: day.meals?.dinner === true,
      },
      transport: day.transport || '',
      places: Array.isArray(day.places) ? day.places : [],
      images: [],
      notes: day.notes || '',
    });
  }
  return result;
};

// ── Shared helper ─────────────────────────────────────────────────────────────
async function buildAIContent(pkg) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const prompt = `Generate compelling marketing content for a travel package with these details:
Name: "${pkg.name || 'Travel Package'}"
Destination: ${pkg.destination || 'Exotic destination'}
Duration: ${pkg.duration || '?'} days
Category: ${pkg.category || 'family'}

Return ONLY a JSON object (no markdown, no extra text):
{
  "description": "2-3 engaging sentences about the package experience",
  "highlights": ["4-6 unique selling points as short phrases"],
  "inclusions": ["5-8 items included in the package"],
  "exclusions": ["4-6 items not included"],
  "terms": ["3-5 concise terms and conditions"]
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

// ── Create a full package + itinerary from scratch ────────────────────────────
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
3. Keep each day's "description" under 100 words so the full response fits.
4. Every day needs a distinct, real-sounding hotel/resort name and address for "accommodation" — do not leave accommodation fields blank.

Return a JSON object with these exact fields:
{
  "name": "Package name",
  "description": "2-3 sentence description",
  "destination": "${destination}",
  "duration": ${duration},
  "price": number,
  "category": "${category}",
  "inclusions": ["array", "of", "inclusions"],
  "exclusions": ["array", "of", "exclusions"],
  "highlights": ["array", "of", "highlights"],
  "terms": ["array", "of", "terms"],
  "itinerary": {
    "days": [
      {
        "dayNumber": 1,
        "title": "Day title",
        "description": "Day description",
        "locations": ["location1", "location2"],
        "activities": ["activity1", "activity2"],
        "meals": {"breakfast": true, "lunch": true, "dinner": true},
        "transport": "car / flight / train / boat / walk",
        "accommodation": {"name": "hotel name", "address": "full address", "contactNumber": "+xx xxx xxx xxxx", "type": "hotel", "rating": 4},
        "notes": "any traveler-relevant tip for the day"
      }
      // ... one object per day, continue through dayNumber ${duration}
    ]
  }
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

  const { itinerary: itineraryData, ...pkgBody } = packageData;
  pkgBody.duration = duration;
  const normalizedDays = normalizeDays(itineraryData?.days, duration);
  const slug = slugify(pkgBody.name, { lower: true, strict: true }) + '-' + Date.now();

  const pkg = await prisma.package.create({
    data: {
      ...pkgBody,
      category: toValidCategory(pkgBody.category),
      slug,
      status: 'draft',
      createdById: req.user.id,
      itinerary: {
        create: {
          days: normalizedDays,
          status: 'draft',
          createdById: req.user.id,
        },
      },
    },
    include: { itinerary: true, images: true },
  });

  res.status(201).json({ success: true, data: pkg });
});

// ── Generate content from title — does NOT create anything ────────────────────
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
  "terms": ["3-5 key terms and conditions"]
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

// ── Generate AI content for existing package and save it ──────────────────────
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
      highlights:  content.highlights  || [],
      inclusions:  content.inclusions  || [],
      exclusions:  content.exclusions  || [],
      terms:       content.terms       || [],
    },
    include: { itinerary: true, images: true },
  });

  res.json({ success: true, data: updated });
});

// ── Preview AI content for existing package — does NOT save ───────────────────
export const previewAIContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pkg = await prisma.package.findUnique({ where: { id } });
  if (!pkg) throw new AppError('Package not found', 404);
  if (!process.env.GEMINI_API_KEY) throw new AppError('AI not configured', 503);

  const content = await buildAIContent(pkg);
  res.json({ success: true, data: content });
});

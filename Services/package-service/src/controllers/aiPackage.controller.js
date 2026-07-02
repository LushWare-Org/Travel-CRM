import { GoogleGenerativeAI } from '@google/generative-ai';
import slugify from 'slugify';
import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

// ── Shared helper ─────────────────────────────────────────────────────────────
async function buildAIContent(pkg) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
  const { destination, duration, category, budget, travelers, preferences } = req.body;

  if (!destination || !duration) throw new AppError('destination and duration are required', 400);
  if (!process.env.GEMINI_API_KEY) throw new AppError('AI package generation not configured', 503);

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `Generate a complete travel package for ${destination} for ${duration} days. Category: ${category || 'family'}. Budget: ${budget || 'moderate'}. Travelers: ${travelers || 2}. Preferences: ${preferences || 'general sightseeing'}.

Return a JSON object with these exact fields:
{
  "name": "Package name",
  "description": "2-3 sentence description",
  "destination": "${destination}",
  "duration": ${duration},
  "price": number,
  "category": "${category || 'family'}",
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
        "locations": ["location1"],
        "activities": ["activity1", "activity2"],
        "meals": {"breakfast": true, "lunch": true, "dinner": true},
        "transport": "transport type",
        "accommodation": {"name": "hotel", "type": "hotel", "rating": 4}
      }
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
    throw new AppError('Failed to parse AI response', 500);
  }
  if (!packageData) throw new AppError('AI did not return valid package data', 500);

  const { itinerary: itineraryData, ...pkgBody } = packageData;
  const slug = slugify(pkgBody.name, { lower: true, strict: true }) + '-' + Date.now();

  const pkg = await prisma.package.create({
    data: {
      ...pkgBody,
      slug,
      status: 'draft',
      createdById: req.user.id,
      ...(itineraryData && {
        itinerary: {
          create: {
            days: itineraryData.days || [],
            status: 'draft',
            createdById: req.user.id,
          },
        },
      }),
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
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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

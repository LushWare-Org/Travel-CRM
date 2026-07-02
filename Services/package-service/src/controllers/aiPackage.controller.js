import { GoogleGenerativeAI } from '@google/generative-ai';
import slugify from 'slugify';
import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

export const generateAIPackage = asyncHandler(async (req, res) => {
  const { destination, duration, category, budget, travelers, preferences } = req.body;

  if (!destination || !duration) throw new AppError('destination and duration are required', 400);

  if (!process.env.GEMINI_API_KEY) {
    throw new AppError('AI package generation not configured', 503);
  }

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

import { GoogleGenerativeAI } from '@google/generative-ai';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

export const suggestHotels = asyncHandler(async (req, res) => {
  const { destination, checkIn, checkOut, guests, budget, preferences } = req.body;

  if (!destination) throw new AppError('destination is required', 400);

  if (!process.env.GEMINI_API_KEY) {
    return res.json({ success: true, data: { hotels: [], message: 'AI hotel suggestions not configured' } });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `Suggest 5 hotels in ${destination} for ${guests || 2} guests${checkIn ? ` from ${checkIn} to ${checkOut}` : ''}${budget ? ` with a budget of ${budget}` : ''}${preferences ? `. Preferences: ${preferences}` : ''}. Return JSON array with: name, rating, priceRange, amenities (array), description, location.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  let hotels;
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    hotels = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    hotels = [];
  }

  res.json({ success: true, data: { hotels, destination } });
});

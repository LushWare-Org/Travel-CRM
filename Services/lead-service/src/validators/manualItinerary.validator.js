import { z } from 'zod';

const dayAccommodation = z
  .object({
    name: z.string().optional(),
    type: z.enum(['hotel', 'resort', 'guesthouse', 'homestay', 'camp', 'other']).optional(),
    address: z.string().optional(),
  })
  .strict()
  .nullable()
  .optional();

const dayMeals = z
  .object({
    breakfast: z.boolean().optional(),
    lunch: z.boolean().optional(),
    dinner: z.boolean().optional(),
  })
  .strict()
  .optional();

const dayPlace = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
  })
  .strict();

const daySchema = z
  .object({
    dayNumber: z.number().int().min(1),
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    locations: z.array(z.string()).optional(),
    activities: z.array(z.string()).optional(),
    accommodation: dayAccommodation,
    meals: dayMeals,
    transport: z.enum(['flight', 'train', 'bus', 'car', 'boat', 'walk', 'other']).optional().nullable(),
    places: z.array(dayPlace).optional(),
    notes: z.string().optional().nullable(),
  })
  .strict();

export const manualItineraryWebsiteSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
    destination: z.string().optional().nullable(),
    destinationCountry: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    travelDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    numberOfTravelers: z.number().int().min(1).optional(),
    budget: z.string().optional().nullable(),
    message: z.string().optional().nullable(),
    days: z.array(daySchema).min(1),
  })
  .strict();

export const upsertManualItineraryDaysSchema = z
  .object({
    days: z.array(daySchema).min(1),
  })
  .strict();

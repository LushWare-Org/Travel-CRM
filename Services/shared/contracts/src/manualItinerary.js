import { z } from 'zod';

export const ManualItineraryDay = z.object({
  dayNumber: z.number().int().min(1),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  locations: z.array(z.string()).optional(),
  activities: z.array(z.string()).optional(),
  accommodation: z
    .object({
      name: z.string().optional(),
      type: z.enum(['hotel', 'resort', 'guesthouse', 'homestay', 'camp', 'other']).optional(),
      rating: z.number().optional(),
      address: z.string().optional(),
      contactNumber: z.string().optional(),
    })
    .nullable()
    .optional(),
  meals: z
    .object({
      breakfast: z.boolean().optional(),
      lunch: z.boolean().optional(),
      dinner: z.boolean().optional(),
    })
    .optional(),
  transport: z.enum(['flight', 'train', 'bus', 'car', 'boat', 'walk', 'other']).nullable().optional(),
  // Places are plain location-name strings (PlanYourTripContainer's
  // ItineraryDayPayload.places: string[]), not {name,description} objects.
  places: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
});

// `name` is optional: PlanYourTripContainer.tsx's tested submit flow
// allows an empty name (only email is required client-side), matching
// WebsiteBookingRequest/WebsiteCustomizationRequest's identical
// relaxation. lead-service's manualItineraryWebsiteSchema mirrors this.
export const WebsiteManualItineraryRequest = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  destination: z.string().optional(),
  destinationCountry: z.string().optional(),
  region: z.string().optional(),
  travelDate: z.string().optional(),
  endDate: z.string().optional(),
  numberOfTravelers: z.number().int().min(1).optional(),
  budget: z.string().optional(),
  message: z.string().optional(),
  days: z.array(ManualItineraryDay).min(1),
});

export const WebsiteManualItineraryResult = z.object({
  leadId: z.string(),
  manualItineraryId: z.string(),
  salesRepId: z.string().nullable().optional(),
});

export const ManualItinerarySummary = z
  .object({
    _id: z.string().optional(),
    id: z.string().optional(),
    days: z.array(ManualItineraryDay),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    lead: z
      .object({
        name: z.string().optional(),
        destination: z.string().nullable().optional(),
        numberOfTravelers: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

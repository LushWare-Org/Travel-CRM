import { z } from 'zod';

// Matches exactly the fields Services/lead-service's
// createWebsiteContactLead reads from req.body.
export const WebsiteContactRequest = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
  phone: z.string().optional(),
  travelDate: z.string().optional(),
  destination: z.string().optional(),
  destinationCountry: z.string().optional(),
  locations: z.string().optional(),
});

export const WebsiteContactResult = z.object({
  leadId: z.string(),
  salesRepId: z.string().nullable().optional(),
});

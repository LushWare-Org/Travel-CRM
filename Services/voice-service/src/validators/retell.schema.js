import { z } from 'zod';

const phone = z.string().min(1).max(50);

export const inboundCallSchema = z.object({
  event: z.string().optional(),
  call_inbound: z.object({
    from_number: phone,
    to_number: phone,
    agent_id: z.string().max(255).optional(),
  }),
});

const transcriptTurn = z.object({
  role: z.string().max(32),
  content: z.string().max(5000),
});

export const postCallSchema = z.object({
  event: z.string().optional(),
  call: z.object({
    call_id: z.string().min(1).max(255),
    direction: z.enum(['inbound', 'outbound']).optional(),
    from_number: phone.optional(),
    to_number: phone.optional(),
    start_timestamp: z.number().int().nonnegative().optional(),
    end_timestamp: z.number().int().nonnegative().optional(),
    duration_ms: z.number().int().nonnegative().optional(),
    disconnection_reason: z.string().max(255).optional(),
    recording_url: z.string().url().max(2048).optional(),
    transcript: z.string().max(200_000).optional(),
    transcript_object: z.array(transcriptTurn).max(2000).optional(),
    call_cost: z.object({ combined_cost: z.number().nonnegative().optional() }).partial().optional(),
    call_analysis: z.object({
      call_summary: z.string().max(5000).optional(),
      user_sentiment: z.string().max(64).optional(),
      custom_analysis_data: z.record(z.unknown()).optional(),
    }).partial().optional(),
  }),
});

/**
 * Slots the agent may extract. Mirrors LeadIntakeSlots, and deliberately
 * carries no identifier: the lead is resolved server-side from call_id, never
 * from anything the caller said.
 */
export const extractedSlotsSchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().max(255).optional(),
  destination: z.string().max(255).optional(),
  duration: z.coerce.number().int().min(1).max(30).optional(),
  travelers: z.coerce.number().int().min(1).max(50).optional(),
  budget: z.string().max(255).optional(),
  preferences: z.string().max(1000).optional(),
  needs_rep_followup: z.boolean().optional(),
}).partial();

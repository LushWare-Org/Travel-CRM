import { z } from 'zod';
import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';

// No shared @travel-crm/contracts entry for this endpoint (see
// docs/designs/ai-trip-planning-assistant.md's Implementation shape —
// package-service owns its own local validators for this turn envelope,
// same precedent as itineraryChatSchema). This mirrors that shape on the
// client side rather than re-declaring a stricter contract package-side.

export const WizardTurnTool = z.enum(['set_slot', 'propose_packages', 'answer_policy_question', 'complete_wizard', 'capture_contact']);

const WizardSlotsSchema = z.object({
  destination: z.string().optional(),
  duration: z.number().optional(),
  travelers: z.number().optional(),
  budget: z.string().optional(),
  preferences: z.string().optional(),
});

const WizardContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
});

export const WizardStateSchema = z.object({
  slots: WizardSlotsSchema.optional(),
  selectedPackageId: z.string().optional(),
  contact: WizardContactSchema.optional(),
});

// `id`/`at` are required so a resent sliding window (last MAX_SENT_MESSAGES)
// can be diffed against what package-service already stored, and that stored
// transcript handed to lead-service's intake endpoint as the same messages —
// see docs/designs/chatbot-inbound-lead-intake.md Implementation shape #5/#6.
export const WizardTurnMessage = z.object({
  id: z.string().min(1).max(255),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
  at: z.string().datetime(),
});

export const WizardTurnRequest = z.object({
  sessionId: z.string().optional(),
  wizardState: WizardStateSchema.optional(),
  messages: z.array(WizardTurnMessage).min(1).max(20),
});

export const WizardTurnResult = z.object({
  toolCall: z.object({ tool: WizardTurnTool, args: z.record(z.string(), z.unknown()) }),
  serverResult: z.record(z.string(), z.unknown()).nullable(),
  updatedWizardState: WizardStateSchema,
  uiComponent: z.string(),
  message: z.string(),
});

export type WizardState = z.infer<typeof WizardStateSchema>;
export type WizardTurnMessageT = z.infer<typeof WizardTurnMessage>;
export type WizardTurnResultT = z.infer<typeof WizardTurnResult>;
type WizardTurnPayload = z.infer<typeof WizardTurnRequest>;

export const sendWizardTurn = async (payload: WizardTurnPayload) => {
  const body = WizardTurnRequest.parse(payload);
  const response = await httpClient.post('/packages/wizard-turn', body);
  return parseEnvelope(WizardTurnResult, response.data, 'POST /packages/wizard-turn').data;
};

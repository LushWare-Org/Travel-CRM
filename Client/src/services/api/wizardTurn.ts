import { z } from 'zod';
import httpClient from '../http/client';
import { parseEnvelope } from '../http/envelope';

// No shared @travel-crm/contracts entry for this endpoint (see
// docs/designs/ai-trip-planning-assistant.md's Implementation shape —
// package-service owns its own local validators for this turn envelope,
// same precedent as itineraryChatSchema). This mirrors that shape on the
// client side rather than re-declaring a stricter contract package-side.

export const WizardTurnTool = z.enum(['set_slot', 'propose_packages', 'answer_policy_question', 'complete_wizard']);

const WizardSlotsSchema = z.object({
  destination: z.string().optional(),
  duration: z.number().optional(),
  travelers: z.number().optional(),
  budget: z.string().optional(),
  preferences: z.string().optional(),
});

export const WizardStateSchema = z.object({
  slots: WizardSlotsSchema.optional(),
  selectedPackageId: z.string().optional(),
});

export const WizardTurnMessage = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
});

export const WizardTurnRequest = z.object({
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

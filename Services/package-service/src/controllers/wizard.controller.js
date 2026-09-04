import prisma from '../db/client.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateStructured } from '../ai/geminiClient.js';
import { buildWizardTurnPrompt, wizardTurnResponseSchema } from '../ai/prompts/wizardTurn.v1.js';
import { sanitizeSlots } from './aiPackage.controller.js';
import { assembleWhere, buildInclude, serializePackage, serializePackageList } from '../services/package.service.js';
import { fetchPolicyDocuments } from '../config/policyDocuments.js';
import { retrieveSnippets } from '../services/policyRetrieval.js';
import { getOrgSettings } from '../config/orgSettings.js';

const FALLBACK_POLICY_MESSAGE = "I don't have a confirmed answer to that — please reach out and our team will help.";

function latestUserMessage(messages) {
  for (let i = (messages || []).length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}

// ── Public: non-persisting UI-driven trip-planning wizard turn ──
// Implements docs/designs/ai-trip-planning-assistant.md's Approach C:
// the model picks exactly one tool call from a fixed vocabulary per turn;
// this handler executes the server-side work that tool implies and never
// trusts model-authored text for inventory, pricing, or policy quotes.
export const wizardTurn = asyncHandler(async (req, res) => {
  const { wizardState = {}, messages } = req.body;

  // Policy retrieval is deterministic and cheap (no LLM cost) — always run
  // it against the latest message so a single generateStructured call can
  // both pick the tool AND, if it's answer_policy_question, choose among
  // already-retrieved candidates in the same turn (see wizardTurn.v1.js).
  const [documents, orgSettings] = await Promise.all([fetchPolicyDocuments(), getOrgSettings()]);
  const candidateSnippets = retrieveSnippets(documents, latestUserMessage(messages));

  const prompt = buildWizardTurnPrompt({ wizardState, messages, candidateSnippets });
  const { tool, args = {} } = await generateStructured({ prompt, schema: wizardTurnResponseSchema, maxOutputTokens: 1024 });

  let serverResult = null;
  let updatedWizardState = wizardState;
  let uiComponent;

  switch (tool) {
    case 'set_slot': {
      const mergedSlots = sanitizeSlots(args.slots, wizardState.slots);
      updatedWizardState = { ...wizardState, slots: mergedSlots };
      uiComponent = 'slotPrompt';
      break;
    }

    case 'propose_packages': {
      const criteria = args.criteria || {};
      const where = assembleWhere({
        isActive: true,
        minPrice: criteria.minPrice,
        maxPrice: criteria.maxPrice,
        search: criteria.destination || wizardState.slots?.destination || criteria.preferences,
      });
      // Reuses the exact buildInclude()/serializePackageList() pair
      // searchPackages already uses — no second, parallel serialization path.
      const packages = await prisma.package.findMany({
        where,
        include: buildInclude(),
        orderBy: { rating: 'desc' },
        take: 5,
      });
      serverResult = { packages: packages.map(serializePackageList) };
      uiComponent = 'packageCards';
      break;
    }

    case 'answer_policy_question': {
      const selectedIds = new Set(Array.isArray(args.selectedSnippetIds) ? args.selectedSnippetIds : []);
      // The model is never trusted with quote text — only with picking
      // which of the server-retrieved candidates (if any) apply. Zero
      // candidates, or a selection outside them, always degrades to the
      // fixed fallback; the model cannot override this (Premise 2).
      const chosen = candidateSnippets.filter((s) => selectedIds.has(s.id));
      if (candidateSnippets.length === 0 || chosen.length === 0) {
        serverResult = {
          answered: false,
          fallbackMessage: FALLBACK_POLICY_MESSAGE,
          supportEmail: orgSettings.supportEmail,
          whatsappNumber: orgSettings.whatsappNumber,
        };
      } else {
        serverResult = {
          answered: true,
          snippets: chosen.map((s) => ({ docId: s.docId, title: s.title, quote: s.quote })),
        };
      }
      uiComponent = 'policyAnswer';
      break;
    }

    case 'complete_wizard': {
      // The client sets wizardState.selectedPackageId deterministically when
      // the traveler clicks a proposed package — never parsed by the model
      // out of free text. Re-validated against the DB here regardless.
      const packageId = args.selectedPackageId || wizardState.selectedPackageId;
      const pkg = packageId ? await prisma.package.findUnique({ where: { id: packageId }, include: buildInclude() }) : null;
      if (!pkg || !pkg.isActive) {
        serverResult = { error: 'PACKAGE_NOT_FOUND' };
        uiComponent = 'error';
      } else {
        serverResult = { package: serializePackage(pkg) };
        uiComponent = 'complete';
      }
      break;
    }

    default:
      throw new AppError('AI returned an unrecognized tool', 502);
  }

  res.json({
    success: true,
    data: { toolCall: { tool, args }, serverResult, updatedWizardState, uiComponent, message: args.message || '' },
  });
});

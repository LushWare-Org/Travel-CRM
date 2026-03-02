import Package from '../../../models/package.model.js';
import Lead from '../../../models/lead.model.js';
import AIMemoryService from '../aiMemory.service.js';
import BaseAgent from './baseAgent.js';
import geminiService from '../../gemini.service.js';
import logger from '../../../config/logger.js';
import emailService from '../../../utils/emailService.js';
import packageAIPDFGenerator from '../../../utils/packageAIPDFGenerator.js';
import messagingAgentService from './messagingAgent.service.js';
import followUpAgentService from './followUpAgent.service.js';
import Settings from '../../../models/settings.model.js';

const normalizeText = (value) => (value || '').toLowerCase().trim();
const IMPORTANT_RECOMMENDATION_FIELDS = new Set([
  'budget',
  'destination',
  'destinationCountry',
  'numberOfTravelers',
  'tags',
  'travelDate',
  'endDate',
  'package',
  'customizedPackage',
]);

class RecommendationAgentService extends BaseAgent {
  constructor() {
    super('package-recommendation-agent');
  }

  shouldHandle(eventType) {
    return [
      'lead.created',
      'lead.updated',
      'lead.status.changed',
      'ai.recommendation.requested',
    ].includes(eventType);
  }

  hasImportantRecommendationChanges(changedFields = []) {
    if (!Array.isArray(changedFields) || !changedFields.length) return false;
    return changedFields.some((field) => IMPORTANT_RECOMMENDATION_FIELDS.has(field));
  }

  didRecommendationsChange(previous = [], next = []) {
    const prevIds = previous
      .map((item) => String(item?.package?._id || item?.packageId || ''))
      .filter(Boolean)
      .slice(0, 5);
    const nextIds = next
      .map((item) => String(item?.package?._id || item?.packageId || ''))
      .filter(Boolean)
      .slice(0, 5);

    if (!prevIds.length && nextIds.length) return true;
    if (prevIds.length !== nextIds.length) return true;
    for (let i = 0; i < prevIds.length; i += 1) {
      if (prevIds[i] !== nextIds[i]) return true;
    }
    return false;
  }

  getPurposeCategoryBoost(purpose = '', category = '') {
    const p = normalizeText(purpose);
    const c = normalizeText(category);
    const map = {
      honeymoon: ['honeymoon', 'couple'],
      family: ['family'],
      group: ['group'],
      safari: ['wild safari'],
    };
    const matched = Object.entries(map).find(([key]) => p.includes(key));
    if (!matched) return 0;
    return matched[1].includes(c) ? 1 : 0;
  }

  // legacy scoring algorithm (used as fallback)
  scorePackage(pkg, input, memoryPreference = {}) {
    const budget = Number(input.budget || 0);
    const travelers = Number(input.numberOfTravelers || 1);
    const destination = normalizeText(input.destination || input.destinationCountry);
    const packageDestination = normalizeText(pkg.destination);
    const purpose = input.travelPurpose || '';

    let score = 0;
    const reasons = [];

    if (budget > 0 && pkg.price > 0) {
      const diffRatio = Math.abs(pkg.price - budget) / budget;
      const budgetScore = Math.max(0, 1 - diffRatio);
      score += budgetScore * 0.35;
      reasons.push(`Budget fit ${Math.round(budgetScore * 100)}%`);
    }

    if (destination && packageDestination.includes(destination)) {
      score += 0.3;
      reasons.push('Destination match');
    }

    if (pkg.maxGroupSize >= travelers) {
      score += 0.1;
      reasons.push('Group size supported');
    }

    const purposeBoost = this.getPurposeCategoryBoost(purpose, pkg.category);
    if (purposeBoost > 0) {
      score += 0.1;
      reasons.push('Purpose-aligned category');
    }

    const qualityScore = Math.min(1, ((pkg.rating || 0) / 5) * 0.6 + Math.min(1, (pkg.bookings || 0) / 100) * 0.4);
    score += qualityScore * 0.1;
    reasons.push(`Quality score ${Math.round(qualityScore * 100)}%`);

    const prefDestination = normalizeText(memoryPreference?.preferredDestination);
    if (prefDestination && packageDestination.includes(prefDestination)) {
      score += 0.05;
      reasons.push('Matches learned preference');
    }

    return {
      score: Number(score.toFixed(4)),
      reasons,
    };
  }

  buildRecommendationPrompt(input, packages, memoryPreference = {}, limit = 5) {
    const lines = [];
    lines.push('You are a travel package recommendation engine.');
    lines.push('');
    lines.push('Customer input:');
    lines.push(`- Budget: ${input.budget || 'not specified'}`);
    lines.push(`- Destination: ${input.destination || 'not specified'}`);
    lines.push(`- Number of travelers: ${input.numberOfTravelers || 'not specified'}`);
    lines.push(`- Travel purpose: ${input.travelPurpose || 'not specified'}`);
    if (memoryPreference?.preferredDestination) {
      lines.push(`- Previously expressed preference for destination: ${memoryPreference.preferredDestination}`);
    }
    lines.push('');
    lines.push('Available packages (each line shows id, name, destination, duration (days), price, maxGroupSize, category, rating, bookings):');
    packages.forEach((pkg) => {
      const idStr = pkg._id ? String(pkg._id) : 'unknown';
      lines.push(`- ${idStr}: ${pkg.name} | ${pkg.destination || 'n/a'} | ${pkg.duration || 'n/a'}d | $${pkg.price || 0} | max ${pkg.maxGroupSize || 0} travelers | category: ${pkg.category || 'n/a'} | rating: ${pkg.rating || 0} | bookings: ${pkg.bookings || 0}`);
    });
    lines.push('');
    lines.push(`Please select the top ${limit} packages that best match the customer. Output only a valid JSON array with objects:`);
    lines.push('[');
    lines.push('  {"packageId": "<id>", "score": <0-1>, "reasons": ["reason1","reason2"]},');
    lines.push('  ... up to limit items');
    lines.push(']');
    lines.push('Sort the array by score descending. Do not include any additional text.');
    lines.push('');
    return lines.join('\n');
  }

  parseRecommendationResponse(raw, packages, limit) {
    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return null;
      const arr = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(arr)) return null;
      const recommendations = [];
      for (let i = 0; i < arr.length && recommendations.length < limit; i += 1) {
        const item = arr[i];
        const pkg = packages.find((p) => String(p._id) === String(item.packageId));
        if (!pkg) continue;
        recommendations.push({
          rank: recommendations.length + 1,
          score: typeof item.score === 'number' ? item.score : 0,
          explainability: Array.isArray(item.reasons) ? item.reasons : [],
          package: pkg,
        });
      }
      return recommendations.length ? recommendations : null;
    } catch (e) {
      return null;
    }
  }

  buildRecommendationMessage(lead, recommendations) {
    const greetingName = lead?.name || 'there';
    const leadDestination = lead?.destination || lead?.destinationCountry || 'your destination';
    const intro = `Hi ${greetingName}, based on your travel details, here are our top package recommendations for ${leadDestination}:`;
    const packageLines = recommendations.map((item, index) => {
      const pkg = item.package || {};
      const reasons = Array.isArray(item.explainability) ? item.explainability.filter(Boolean).slice(0, 2) : [];
      const reasonText = reasons.length ? ` (${reasons.join('; ')})` : '';
      return `${index + 1}. ${pkg.name || 'Travel Package'} - ${pkg.destination || 'Destination'} - ${pkg.price ? `USD ${pkg.price}` : 'Price on request'}${reasonText}`;
    });
    const outro = 'Reply to this email and we will finalize the best option for you.';
    return [intro, ...packageLines, '', outro].join('\n');
  }

  buildRecommendationEmailHtml(lead, recommendations, packageAttachments = []) {
    const leadDestination = lead?.destination || lead?.destinationCountry || 'your destination';
    const recommendationRows = recommendations.map((item, index) => {
      const pkg = item.package || {};
      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0;">
            <div style="color: #0F172A; font-size: 16px; font-weight: 600;">${index + 1}. ${pkg.name || 'Travel Package'}</div>
            <div style="color: #334155; font-size: 14px; margin-top: 4px;">${pkg.destination || 'Destination'} | ${pkg.duration ? `${pkg.duration} days` : 'Duration on request'} | ${pkg.price ? `USD ${pkg.price}` : 'Price on request'}</div>
          </td>
        </tr>
      `;
    }).join('');

    const attachmentRows = packageAttachments.map((entry) => `
      <li style="margin: 8px 0; color: #334155; font-size: 14px;">
        <strong>${entry.packageName || 'Travel Package'}</strong>
      </li>
    `).join('');

    return emailService.getEmailTemplate(`
      <h1 style="color: #0F172A; font-size: 28px; margin: 0 0 8px 0;">Your Recommended Travel Options</h1>
      <p style="color: #64748B; line-height: 1.6; margin: 0 0 24px 0;">Hi ${lead?.name || 'there'}, here are our top package recommendations for <strong>${leadDestination}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
        ${recommendationRows}
      </table>
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin: 20px 0;">
        <h2 style="color: #0F172A; font-size: 18px; margin: 0 0 10px 0;">Attached Package PDFs</h2>
        <ul style="padding-left: 20px; margin: 0;">
          ${attachmentRows}
        </ul>
      </div>
      <p style="color: #334155; line-height: 1.6; margin: 20px 0 0 0;">Reply to this email and we will finalize the best option for you.</p>
    `);
  }

  async buildPackageAttachments(recommendations) {
    const seen = new Set();
    const attachments = [];
    const packageArtifacts = [];
    for (const item of recommendations) {
      const pkg = item?.package || {};
      const packageId = String(pkg._id || '');
      if (!packageId || seen.has(packageId)) continue;
      seen.add(packageId);
      const pdfBuffer = await packageAIPDFGenerator.generatePackagePDF(packageId);
      attachments.push({
        filename: `package-${packageId}.pdf`,
        content: pdfBuffer,
      });
      packageArtifacts.push({
        packageId,
        packageName: pkg.name || 'Travel Package',
      });
    }
    return { attachments, packageArtifacts };
  }

  async autoSendRecommendationAndFollowUp({
    event,
    lead,
    recommendations,
    settings,
  }) {
    if (!lead?.email || !recommendations.length) return;

    const { attachments, packageArtifacts } = await this.buildPackageAttachments(recommendations);
    const message = this.buildRecommendationMessage(lead, recommendations);
    const html = this.buildRecommendationEmailHtml(lead, recommendations, packageArtifacts);
    const subject = `Recommended packages for ${lead.destination || lead.destinationCountry || 'your trip'}`;

    await messagingAgentService.execute({
      type: 'recommendation.message.requested',
      correlationId: event.correlationId,
      payload: {
        leadId: String(lead._id),
        subject,
        message,
        html,
        attachments,
        channels: ['email'],
      },
    });

    if (settings?.autoFollowUpEmails && String(lead.status || '').toLowerCase() === 'new') {
      const followUpResult = await followUpAgentService.execute({
        type: 'followup.triggered',
        correlationId: event.correlationId,
        payload: {
          leadId: String(lead._id),
          channels: ['email'],
          suppressPublish: true,
        },
      });

      if (!followUpResult?.skipped && followUpResult?.message) {
        await messagingAgentService.execute({
          type: 'followup.message.requested',
          correlationId: event.correlationId,
          payload: {
            leadId: String(lead._id),
            message: followUpResult.message,
            channels: ['email'],
          },
        });
      }
    }
  }

  async recommendPackages(input, limit = 5) {
    const query = {
      isActive: true,
      status: { $in: ['published', 'draft'] },
    };
    const packages = await Package.find(query)
      .select('name destination duration price maxGroupSize category rating bookings')
      .limit(300)
      .lean();

    const memory = input.leadId
      ? await AIMemoryService.getLatest('lead', input.leadId, 'preference')
      : null;
    const memoryPreference = memory?.content || {};

    let recommendations = null;
    try {
      const prompt = this.buildRecommendationPrompt(input, packages, memoryPreference, limit);
      const raw = await geminiService.generateContent(prompt, { temperature: 0.6, maxTokens: 800 });
      recommendations = this.parseRecommendationResponse(raw, packages, limit);
    } catch (error) {
      logger?.warn?.('Gemini recommendation failed, falling back to rule-based scoring:', error.message || error);
    }

    if (!recommendations) {
      const ranked = packages.map((pkg) => {
        const result = this.scorePackage(pkg, input, memoryPreference);
        return {
          package: pkg,
          score: result.score,
          reasons: result.reasons,
        };
      });
      ranked.sort((a, b) => b.score - a.score);
      recommendations = ranked.slice(0, limit).map((entry, index) => ({
        rank: index + 1,
        score: entry.score,
        explainability: entry.reasons,
        package: entry.package,
      }));
    }

    return recommendations;
  }

  async comparePackages(packageIds, context = {}) {
    const packages = await Package.find({ _id: { $in: packageIds } })
      .select('name destination duration price maxGroupSize category rating bookings')
      .lean();
    const comparison = packages.map((pkg) => {
      const scored = this.scorePackage(pkg, context, {});
      return {
        packageId: pkg._id,
        name: pkg.name,
        metrics: {
          price: pkg.price,
          duration: pkg.duration,
          rating: pkg.rating || 0,
          bookings: pkg.bookings || 0,
          category: pkg.category,
        },
        score: scored.score,
        explainability: scored.reasons,
      };
    });
    comparison.sort((a, b) => b.score - a.score);
    return comparison;
  }

  async execute(event) {
    const leadId = event?.payload?.leadId;
    const lead = leadId ? await Lead.findById(leadId).lean() : null;

    const input = {
      leadId,
      budget: event.payload?.budget || lead?.budget,
      destination: event.payload?.destination || lead?.destination || lead?.destinationCountry,
      numberOfTravelers: event.payload?.numberOfTravelers || lead?.numberOfTravelers,
      travelPurpose: event.payload?.travelPurpose || lead?.tags?.join(' '),
    };

    const previousRecommendationMemory = leadId
      ? await AIMemoryService.getLatest('lead', leadId, 'recommendation')
      : null;
    const previousRecommendations = previousRecommendationMemory?.content?.recommendations || [];

    const recommendations = await this.recommendPackages(input, event.payload?.limit || 5);
    const settings = await Settings.getSingleton();

    if (leadId) {
      await AIMemoryService.upsertMemory({
        scopeType: 'lead',
        scopeId: leadId,
        memoryType: 'recommendation',
        summary: `Generated ${recommendations.length} recommendations`,
        content: { input, recommendations },
        lastAgent: this.name,
        confidence: 0.7,
      });
    }

    const shouldAutoSend = (() => {
      if (!lead?.email) return false;
      if (!settings?.autoRecommendationEmails) return false;
      if (event.type === 'lead.created') return true;
      if (event.type !== 'lead.updated') return false;
      if (!this.hasImportantRecommendationChanges(event?.payload?.changedFields)) return false;
      return this.didRecommendationsChange(previousRecommendations, recommendations);
    })();

    if (shouldAutoSend) {
      try {
        await this.autoSendRecommendationAndFollowUp({
          event,
          lead,
          recommendations,
          settings,
        });
      } catch (error) {
        logger.warn(`Auto recommendation/follow-up send failed for lead ${leadId}: ${error.message}`);
      }
    }

    return { recommendations };
  }
}

export default new RecommendationAgentService();

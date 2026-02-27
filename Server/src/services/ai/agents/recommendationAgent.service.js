import Package from '../../../models/package.model.js';
import Lead from '../../../models/lead.model.js';
import AIMemoryService from '../aiMemory.service.js';
import BaseAgent from './baseAgent.js';
import geminiService from '../../gemini.service.js';
import logger from '../../../config/logger.js';

const normalizeText = (value) => (value || '').toLowerCase().trim();

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

  /**
   * Build a prompt for Gemini to score and rank packages
   */
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

  /**
   * Attempt to parse Gemini output into recommendation objects. Returns null if parsing fails.
   */
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

    // attempt LLM recommendations
    let recommendations = null;
    try {
      const prompt = this.buildRecommendationPrompt(input, packages, memoryPreference, limit);
      const raw = await geminiService.generateContent(prompt, { temperature: 0.6, maxTokens: 800 });
      recommendations = this.parseRecommendationResponse(raw, packages, limit);
    } catch (error) {
      // log error and fallback to traditional ranking
      // avoid crashing when LLM is unavailable
      // eslint-disable-next-line no-console
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

    const recommendations = await this.recommendPackages(input, event.payload?.limit || 5);
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
    return { recommendations };
  }
}

export default new RecommendationAgentService();

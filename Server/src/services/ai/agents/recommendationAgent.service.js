import Package from '../../../models/package.model.js';
import Lead from '../../../models/lead.model.js';
import AIMemoryService from '../aiMemory.service.js';
import BaseAgent from './baseAgent.js';

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

    const ranked = packages.map((pkg) => {
      const result = this.scorePackage(pkg, input, memoryPreference);
      return {
        package: pkg,
        score: result.score,
        reasons: result.reasons,
      };
    });

    ranked.sort((a, b) => b.score - a.score);
    const recommendations = ranked.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      score: entry.score,
      explainability: entry.reasons,
      package: entry.package,
    }));

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

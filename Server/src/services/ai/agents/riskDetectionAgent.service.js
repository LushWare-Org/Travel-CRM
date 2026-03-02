import User from '../../../models/user.model.js';
import Lead from '../../../models/lead.model.js';
import PaymentReceipt from '../../../models/paymentReceipt.model.js';
import CustomerRetentionState from '../../../models/customerRetentionState.model.js';
import CustomerRiskSnapshot from '../../../models/customerRiskSnapshot.model.js';
import EventOutbox from '../../../models/eventOutbox.model.js';
import logger from '../../../config/logger.js';
import churnModelPredictorService from './churnModelPredictor.service.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECOVERY_SOURCE_STATES = new Set([
  'AT_RISK',
  'FOLLOW_UP_STAGE_1',
  'FOLLOW_UP_STAGE_2',
  'FOLLOW_UP_STAGE_3',
  'ESCALATED',
]);

const sourceToAcquisitionChannel = (source) => {
  const normalized = String(source || '').toLowerCase();
  if (['website', 'social-media', 'referral'].includes(normalized)) return 'Referral';
  if (['booking', 'walk-in', 'phone-call'].includes(normalized)) return 'Organic';
  if (['email'].includes(normalized)) return 'Direct';
  return 'Direct';
};

const toDateKey = (date) => new Date(date).toISOString().slice(0, 10);

const startOfDay = (dateInput) => {
  let date;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map((part) => Number(part));
    date = new Date(Date.UTC(year, month - 1, day));
  } else {
    date = dateInput ? new Date(dateInput) : new Date();
  }
  if (Number.isNaN(date.getTime())) {
    throw new Error(`invalid score date: ${dateInput}`);
  }
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const weight = rank - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

export const classifyRisk = (probability) => {
  const p = Number(probability || 0);
  if (p < 0.35) return 'LOW';
  if (p < 0.65) return 'MED';
  if (p < 0.8) return 'HIGH';
  return 'CRITICAL';
};

export const computePriority = (probability, ltv, ltvP95) => {
  const safeLtvP95 = Math.max(1, Number(ltvP95 || 0));
  const normalizedLtv = clamp(Number(ltv || 0) / safeLtvP95, 0, 1);
  const priorityScore = clamp(Number(probability || 0), 0, 1) * normalizedLtv;
  return { priorityScore, normalizedLtv };
};

export const resolveRetentionTransition = ({
  riskLevel,
  currentState,
  now = new Date(),
}) => {
  const cooldownUntil = currentState?.cooldownUntil ? new Date(currentState.cooldownUntil) : null;
  const inCooldown = cooldownUntil && cooldownUntil > now;
  const currentStatus = currentState?.retentionStatus || 'HEALTHY';

  if (['HIGH', 'CRITICAL'].includes(riskLevel) && !inCooldown) {
    return {
      action: 'AT_RISK',
      eventType: 'customer.at_risk',
      updates: {
        retentionStatus: 'AT_RISK',
        followUpStage: 0,
        nextFollowUpAt: new Date(now.getTime() + (riskLevel === 'CRITICAL' ? 2 * 60 * 60 * 1000 : MS_PER_DAY)),
      },
    };
  }

  if (['LOW', 'MED'].includes(riskLevel) && RECOVERY_SOURCE_STATES.has(currentStatus)) {
    return {
      action: 'RECOVERED',
      eventType: 'customer.recovered',
      updates: {
        retentionStatus: 'RECOVERED',
        followUpStage: 0,
        nextFollowUpAt: null,
        cooldownUntil: new Date(now.getTime() + (14 * MS_PER_DAY)),
      },
    };
  }

  return {
    action: 'NO_CHANGE',
    eventType: null,
    updates: {},
  };
};

const safeNumber = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
};

const toFeaturePayload = ({
  leadSeed,
  createdAt,
  paymentStats,
  sessionStats,
  now,
  ltv12m,
}) => {
  const daysSinceLastPurchase = paymentStats.lastPurchaseAt
    ? clamp(Math.floor((now.getTime() - paymentStats.lastPurchaseAt.getTime()) / MS_PER_DAY), 0, 3650)
    : 365;

  const avgOrderValue = paymentStats.purchasesLast180d > 0
    ? paymentStats.totalSpendLast180d / paymentStats.purchasesLast180d
    : 0;

  const baseline90Spend = Math.max((paymentStats.totalSpendLast90d - paymentStats.totalSpendLast30d) / 2, 1);
  const purchaseTrend3m = (paymentStats.totalSpendLast30d - baseline90Spend) / baseline90Spend;

  const baselineSessions30From90 = Math.max(sessionStats.sessionsLast90d / 3, 1);
  const engagementChangeRatio = sessionStats.sessionsLast30d / baselineSessions30From90;
  const frequencyChangeRatio = paymentStats.purchasesLast30d / Math.max(paymentStats.purchasesLast90d / 3, 1);

  const recencyScore = 1 - clamp(daysSinceLastPurchase / 180, 0, 1);
  const frequencyScore = clamp(paymentStats.purchasesLast90d / 12, 0, 1);
  const monetaryScore = clamp(ltv12m / Math.max(paymentStats.spendP90Reference, 1), 0, 1);
  const rfmScore = (recencyScore * 0.4) + (frequencyScore * 0.3) + (monetaryScore * 0.3);

  const planType = ltv12m > 5000 ? 'Premium' : (ltv12m > 1500 ? 'Standard' : 'Basic');

  return {
    customer_age_days: clamp(Math.floor((now.getTime() - new Date(createdAt).getTime()) / MS_PER_DAY), 0, 20000),
    acquisition_channel: sourceToAcquisitionChannel(leadSeed?.source),
    plan_type: planType,
    days_since_last_purchase: daysSinceLastPurchase,
    purchases_last_30d: paymentStats.purchasesLast30d,
    purchases_last_90d: paymentStats.purchasesLast90d,
    purchases_last_180d: paymentStats.purchasesLast180d,
    total_spend_last_30d: paymentStats.totalSpendLast30d,
    total_spend_last_90d: paymentStats.totalSpendLast90d,
    total_spend_last_180d: paymentStats.totalSpendLast180d,
    avg_order_value_last_180d: avgOrderValue,
    sessions_last_30d: sessionStats.sessionsLast30d,
    sessions_last_90d: sessionStats.sessionsLast90d,
    active_days_last_30d: sessionStats.activeDaysLast30d,
    active_days_last_90d: sessionStats.activeDaysLast90d,
    email_open_rate_last_90d: sessionStats.emailOpenRateLast90d,
    email_click_rate_last_90d: sessionStats.emailClickRateLast90d,
    tickets_last_30d: sessionStats.ticketsLast30d,
    tickets_last_90d: sessionStats.ticketsLast90d,
    avg_resolution_time: sessionStats.avgResolutionTimeHours,
    payment_failures_last_90d: paymentStats.paymentFailuresLast90d,
    refunds_last_180d: paymentStats.refundsLast180d,
    purchase_trend_3m: purchaseTrend3m,
    engagement_change_ratio: engagementChangeRatio,
    frequency_change_ratio: frequencyChangeRatio,
    rfm_score: clamp(rfmScore, 0, 1),
  };
};

const summarizeLeadSessions = (leads, now) => {
  const d30 = new Date(now.getTime() - (30 * MS_PER_DAY));
  const d90 = new Date(now.getTime() - (90 * MS_PER_DAY));
  const dayKeySet30 = new Set();
  const dayKeySet90 = new Set();

  let sessionsLast30d = 0;
  let sessionsLast90d = 0;
  let ticketsLast30d = 0;
  let ticketsLast90d = 0;

  for (const lead of leads) {
    const logs = Array.isArray(lead.communicationLogs) ? lead.communicationLogs : [];
    for (const log of logs) {
      const when = log?.date ? new Date(log.date) : null;
      if (!when || Number.isNaN(when.getTime())) continue;
      const isTicket = /ticket|issue|problem|support/i.test(String(log.notes || ''));
      if (when >= d90) {
        sessionsLast90d += 1;
        dayKeySet90.add(toDateKey(when));
        if (isTicket) ticketsLast90d += 1;
      }
      if (when >= d30) {
        sessionsLast30d += 1;
        dayKeySet30.add(toDateKey(when));
        if (isTicket) ticketsLast30d += 1;
      }
    }
  }

  const emailOpenRateLast90d = clamp((sessionsLast90d > 0 ? sessionsLast30d / sessionsLast90d : 0.15), 0, 1);
  const emailClickRateLast90d = clamp(emailOpenRateLast90d * 0.35, 0, 1);
  const avgResolutionTimeHours = ticketsLast90d > 0 ? 24 : 18;

  return {
    sessionsLast30d,
    sessionsLast90d,
    activeDaysLast30d: dayKeySet30.size,
    activeDaysLast90d: dayKeySet90.size,
    ticketsLast30d,
    ticketsLast90d,
    emailOpenRateLast90d,
    emailClickRateLast90d,
    avgResolutionTimeHours,
  };
};

const summarizePaymentStats = (receipts, now) => {
  const d30 = new Date(now.getTime() - (30 * MS_PER_DAY));
  const d90 = new Date(now.getTime() - (90 * MS_PER_DAY));
  const d180 = new Date(now.getTime() - (180 * MS_PER_DAY));
  const d365 = new Date(now.getTime() - (365 * MS_PER_DAY));

  let purchasesLast30d = 0;
  let purchasesLast90d = 0;
  let purchasesLast180d = 0;
  let totalSpendLast30d = 0;
  let totalSpendLast90d = 0;
  let totalSpendLast180d = 0;
  let paymentFailuresLast90d = 0;
  let refundsLast180d = 0;
  let ltv12m = 0;
  let lastPurchaseAt = null;
  const spendSamples12m = [];

  for (const row of receipts) {
    const when = row.paymentDate ? new Date(row.paymentDate) : null;
    if (!when || Number.isNaN(when.getTime())) continue;
    const amount = safeNumber(row.amount);
    const isRefund = row.paymentType === 'refund' || row.receiptStatus === 'refunded';
    const isFailure = row.receiptStatus === 'cancelled';
    if (isFailure && when >= d90) {
      paymentFailuresLast90d += 1;
    }
    if (isRefund && when >= d180) {
      refundsLast180d += 1;
    }

    const signedAmount = isRefund ? -Math.abs(amount) : amount;

    if (!isRefund && !isFailure) {
      if (!lastPurchaseAt || when > lastPurchaseAt) {
        lastPurchaseAt = when;
      }
      if (when >= d30) {
        purchasesLast30d += 1;
        totalSpendLast30d += amount;
      }
      if (when >= d90) {
        purchasesLast90d += 1;
        totalSpendLast90d += amount;
      }
      if (when >= d180) {
        purchasesLast180d += 1;
        totalSpendLast180d += amount;
      }
    }

    if (when >= d365 && !isFailure) {
      ltv12m += signedAmount;
      spendSamples12m.push(Math.max(0, signedAmount));
    }
  }

  const spendP90Reference = percentile(spendSamples12m.length ? spendSamples12m : [Math.max(ltv12m, 1)], 90);

  return {
    purchasesLast30d,
    purchasesLast90d,
    purchasesLast180d,
    totalSpendLast30d: Math.max(0, totalSpendLast30d),
    totalSpendLast90d: Math.max(0, totalSpendLast90d),
    totalSpendLast180d: Math.max(0, totalSpendLast180d),
    paymentFailuresLast90d,
    refundsLast180d,
    ltv12m: Math.max(0, ltv12m),
    lastPurchaseAt,
    spendP90Reference,
  };
};

const createDedupeKey = (eventType, customerId, scoreDate) => `${eventType}:${customerId}:${toDateKey(scoreDate)}`;

const queueOutboxEvent = async ({
  eventType,
  payload,
  customerId,
  scoreDate,
}) => {
  const dedupeKey = createDedupeKey(eventType, customerId, scoreDate);
  await EventOutbox.updateOne(
    { dedupeKey },
    {
      $setOnInsert: {
        eventType,
        source: 'risk-detection-agent',
        dedupeKey,
        payload,
        status: 'pending',
      },
    },
    { upsert: true },
  );
};

const fallbackProbability = (featurePayload) => {
  const inactivityRisk = clamp((safeNumber(featurePayload.days_since_last_purchase) - 30) / 180, 0, 1);
  const refundRisk = clamp(safeNumber(featurePayload.refunds_last_180d) / 3, 0, 1);
  const trendRisk = clamp((-safeNumber(featurePayload.purchase_trend_3m)) / 3, 0, 1);
  const engagementRisk = 1 - clamp(safeNumber(featurePayload.engagement_change_ratio), 0, 1);
  const base = (inactivityRisk * 0.35) + (refundRisk * 0.2) + (trendRisk * 0.25) + (engagementRisk * 0.2);
  return clamp(base, 0, 1);
};

class RiskDetectionAgentService {
  async buildCustomerInputs(customer, scoreDate) {
    const now = new Date();
    const email = customer.email ? String(customer.email).toLowerCase() : null;
    if (!email) {
      return {
        customerId: String(customer._id),
        customer,
        ltv12m: 0,
        featurePayload: toFeaturePayload({
          customer,
          leadSeed: null,
          createdAt: customer.createdAt || now,
          paymentStats: {
            purchasesLast30d: 0,
            purchasesLast90d: 0,
            purchasesLast180d: 0,
            totalSpendLast30d: 0,
            totalSpendLast90d: 0,
            totalSpendLast180d: 0,
            paymentFailuresLast90d: 0,
            refundsLast180d: 0,
            lastPurchaseAt: null,
            spendP90Reference: 1,
          },
          sessionStats: {
            sessionsLast30d: 0,
            sessionsLast90d: 0,
            activeDaysLast30d: 0,
            activeDaysLast90d: 0,
            ticketsLast30d: 0,
            ticketsLast90d: 0,
            emailOpenRateLast90d: 0.15,
            emailClickRateLast90d: 0.05,
            avgResolutionTimeHours: 24,
          },
          now,
          ltv12m: 0,
        }),
      };
    }

    const since365d = new Date(scoreDate.getTime() - (365 * MS_PER_DAY));
    const [leads, receipts] = await Promise.all([
      Lead.find({ email }).select('source communicationLogs updatedAt').lean(),
      PaymentReceipt.find({
        'customer.email': email,
        paymentDate: { $gte: since365d },
      })
        .select('amount paymentDate paymentType receiptStatus')
        .lean(),
    ]);

    const paymentStats = summarizePaymentStats(receipts, now);
    const sessionStats = summarizeLeadSessions(leads, now);
    const leadSeed = leads[0] || null;

    const featurePayload = toFeaturePayload({
      customer,
      leadSeed,
      createdAt: customer.createdAt || now,
      paymentStats,
      sessionStats,
      now,
      ltv12m: paymentStats.ltv12m,
    });

    return {
      customerId: String(customer._id),
      customer,
      featurePayload,
      ltv12m: paymentStats.ltv12m,
    };
  }

  async runDailyRiskDetection(date, options = {}) {
    const scoreDate = startOfDay(date);
    const now = new Date();
    const activeCustomers = await User.find({ role: 'customer', isActive: true })
      .select('_id email createdAt')
      .lean();

    const prepared = [];
    let failed = 0;
    for (const customer of activeCustomers) {
      try {
        const input = await this.buildCustomerInputs(customer, scoreDate);
        prepared.push(input);
      } catch (error) {
        failed += 1;
        logger.error('[RiskDetectionAgent] Customer feature build failed', {
          customerId: String(customer._id),
          error: error.message,
          stack: error.stack,
        });
      }
    }

    let modelVersion = 'advanced_xgb_churn_model';
    let probabilities = [];
    const predictor = options.predictor || churnModelPredictorService.predictBatch.bind(churnModelPredictorService);
    try {
      const prediction = await predictor(prepared.map((item) => item.featurePayload), options);
      probabilities = prediction.probabilities || [];
      modelVersion = prediction.modelVersion || modelVersion;
    } catch (error) {
      logger.error('[RiskDetectionAgent] Model scoring failed, using heuristic fallback', {
        error: error.message,
      });
      probabilities = prepared.map((item) => fallbackProbability(item.featurePayload));
      modelVersion = 'advanced_xgb_churn_model:fallback';
    }

    const ltvP95 = percentile(prepared.map((item) => safeNumber(item.ltv12m)), 95);

    let processedCustomers = 0;
    let atRiskCount = 0;
    let recoveredCount = 0;

    for (let i = 0; i < prepared.length; i += 1) {
      const item = prepared[i];
      const pChurn30d = clamp(safeNumber(probabilities[i]), 0, 1);
      const riskLevel = classifyRisk(pChurn30d);
      const { priorityScore, normalizedLtv } = computePriority(pChurn30d, item.ltv12m, ltvP95);

      try {
        await CustomerRiskSnapshot.findOneAndUpdate(
          { customer: item.customer._id, scoreDate },
          {
            customer: item.customer._id,
            scoreDate,
            churnProbability: pChurn30d,
            riskLevel,
            priorityScore,
            ltv: item.ltv12m,
            ltvP95,
            normalizedLtv,
            modelVersion,
            featurePayload: item.featurePayload,
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          },
        );

        const currentState = await CustomerRetentionState.findOne({ customer: item.customer._id });
        const transition = resolveRetentionTransition({
          riskLevel,
          currentState,
          now,
        });

        const sharedUpdates = {
          lastRiskLevel: riskLevel,
          lastScoredAt: now,
          lastPriorityScore: priorityScore,
          lastChurnProbability: pChurn30d,
          modelVersion,
        };

        const stateUpdate = {
          ...sharedUpdates,
          ...transition.updates,
        };

        await CustomerRetentionState.findOneAndUpdate(
          { customer: item.customer._id },
          {
            $set: stateUpdate,
            $setOnInsert: {
              customer: item.customer._id,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          },
        );

        if (transition.eventType) {
          await queueOutboxEvent({
            eventType: transition.eventType,
            customerId: String(item.customer._id),
            scoreDate,
            payload: {
              customerId: String(item.customer._id),
              scoreDate: toDateKey(scoreDate),
              churnProbability: pChurn30d,
              riskLevel,
              priorityScore,
              modelVersion,
              triggeredAt: now.toISOString(),
            },
          });
        }

        if (transition.action === 'AT_RISK') atRiskCount += 1;
        if (transition.action === 'RECOVERED') recoveredCount += 1;
        processedCustomers += 1;
      } catch (error) {
        failed += 1;
        logger.error('[RiskDetectionAgent] Customer scoring failed', {
          customerId: item.customerId,
          error: error.message,
          stack: error.stack,
        });
      }
    }

    const summary = {
      scoreDate: toDateKey(scoreDate),
      modelVersion,
      processedCustomers,
      failedCustomers: failed,
      atRiskCount,
      recoveredCount,
      totalActiveCustomers: activeCustomers.length,
    };

    logger.info('[RiskDetectionAgent] Daily batch completed', summary);
    return summary;
  }
}

const riskDetectionAgentService = new RiskDetectionAgentService();
export default riskDetectionAgentService;

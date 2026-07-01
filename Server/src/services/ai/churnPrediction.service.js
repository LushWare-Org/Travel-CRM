import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../../models/user.model.js';
import CustomerChurnScore from '../../models/customerChurnScore.model.js';
import churnModelPredictorService from './agents/churnModelPredictor.service.js';
import riskDetectionAgentService, { classifyRisk } from './agents/riskDetectionAgent.service.js';
import logger from '../../config/logger.js';
import retentionLoggerService from './retentionLogger.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_PATH = path.resolve(__dirname, './models/advanced_xgb_churn_model.pkl');

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

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value || 0)));

class ChurnPredictionService {
  async assertModelAvailable() {
    await fs.access(MODEL_PATH);
    return MODEL_PATH;
  }

  async predictCustomerChurn(customerId) {
    const customer = await User.findOne({
      _id: customerId,
      role: 'customer',
      isActive: true,
    })
      .select('_id email createdAt')
      .lean();

    if (!customer) {
      throw new Error('active customer not found');
    }

    await this.assertModelAvailable();

    const input = await riskDetectionAgentService.buildCustomerInputs(customer, new Date());
    const prediction = await churnModelPredictorService.predictBatch([input.featurePayload]);
    const churnProbability = clamp(prediction?.probabilities?.[0], 0, 1);
    const riskLevel = classifyRisk(churnProbability);

    return {
      customerId: String(customer._id),
      churnProbability,
      riskLevel,
    };
  }

  async runDailyChurnPrediction(date) {
    const scoreDate = startOfDay(date);
    const activeCustomers = await User.find({ role: 'customer', isActive: true })
      .select('_id email createdAt')
      .lean();

    await this.assertModelAvailable();

    const prepared = [];
    for (const customer of activeCustomers) {
      try {
        const input = await riskDetectionAgentService.buildCustomerInputs(customer, scoreDate);
        prepared.push(input);
      } catch (error) {
        logger.error('[ChurnPrediction] Failed to build input', {
          customerId: String(customer._id),
          error: error.message,
        });
      }
    }

    const prediction = await churnModelPredictorService.predictBatch(
      prepared.map((item) => item.featurePayload),
    );
    const probabilities = Array.isArray(prediction?.probabilities) ? prediction.probabilities : [];

    let saved = 0;
    let failed = 0;
    for (let i = 0; i < prepared.length; i += 1) {
      const item = prepared[i];
      try {
        const pChurn = clamp(probabilities[i], 0, 1);
        const riskLevel = classifyRisk(pChurn);
        await CustomerChurnScore.create({
          customer: item.customer._id,
          pChurn,
          riskLevel,
          scoredAt: scoreDate,
        });
        await retentionLoggerService.log(item.customer._id, 'churn.predicted', {
          pChurn,
          riskLevel,
          scoredAt: scoreDate.toISOString(),
        });
        saved += 1;
      } catch (error) {
        failed += 1;
        logger.error('[ChurnPrediction] Failed to save score', {
          customerId: item.customerId,
          error: error.message,
        });
      }
    }

    return {
      scoreDate: scoreDate.toISOString().slice(0, 10),
      modelPath: MODEL_PATH,
      totalActiveCustomers: activeCustomers.length,
      preparedCustomers: prepared.length,
      savedScores: saved,
      failedScores: failed,
    };
  }
}

export default new ChurnPredictionService();

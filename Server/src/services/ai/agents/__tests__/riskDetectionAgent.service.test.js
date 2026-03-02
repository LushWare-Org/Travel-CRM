/* eslint-env jest */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../../../models/user.model.js';
import CustomerRetentionState from '../../../../models/customerRetentionState.model.js';
import CustomerRiskSnapshot from '../../../../models/customerRiskSnapshot.model.js';
import EventOutbox from '../../../../models/eventOutbox.model.js';
import riskDetectionAgentService, {
  classifyRisk,
  resolveRetentionTransition,
} from '../riskDetectionAgent.service.js';

let mongoServer;

const createCustomer = async (suffix = '1') => User.create({
  name: `Customer ${suffix}`,
  email: `customer${suffix}@example.com`,
  password: 'Passw0rd!',
  role: 'customer',
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Promise.all([
    CustomerRetentionState.syncIndexes(),
    CustomerRiskSnapshot.syncIndexes(),
    EventOutbox.syncIndexes(),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    CustomerRetentionState.deleteMany({}),
    CustomerRiskSnapshot.deleteMany({}),
    EventOutbox.deleteMany({}),
  ]);
});

describe('classifyRisk', () => {
  test('returns expected risk buckets at thresholds', () => {
    expect(classifyRisk(0)).toBe('LOW');
    expect(classifyRisk(0.3499)).toBe('LOW');
    expect(classifyRisk(0.35)).toBe('MED');
    expect(classifyRisk(0.6499)).toBe('MED');
    expect(classifyRisk(0.65)).toBe('HIGH');
    expect(classifyRisk(0.7999)).toBe('HIGH');
    expect(classifyRisk(0.8)).toBe('CRITICAL');
    expect(classifyRisk(1)).toBe('CRITICAL');
  });
});

describe('resolveRetentionTransition', () => {
  test('enters AT_RISK on high risk when not in cooldown', () => {
    const now = new Date('2026-03-02T00:00:00.000Z');
    const transition = resolveRetentionTransition({
      riskLevel: 'HIGH',
      currentState: { retentionStatus: 'HEALTHY' },
      now,
    });

    expect(transition.action).toBe('AT_RISK');
    expect(transition.eventType).toBe('customer.at_risk');
    expect(transition.updates.retentionStatus).toBe('AT_RISK');
  });

  test('recovers from AT_RISK on low risk', () => {
    const now = new Date('2026-03-02T00:00:00.000Z');
    const transition = resolveRetentionTransition({
      riskLevel: 'LOW',
      currentState: { retentionStatus: 'AT_RISK' },
      now,
    });

    expect(transition.action).toBe('RECOVERED');
    expect(transition.eventType).toBe('customer.recovered');
    expect(transition.updates.retentionStatus).toBe('RECOVERED');
    expect(transition.updates.cooldownUntil).toBeInstanceOf(Date);
  });

  test('respects cooldown and does not re-enter AT_RISK', () => {
    const now = new Date('2026-03-02T00:00:00.000Z');
    const transition = resolveRetentionTransition({
      riskLevel: 'CRITICAL',
      currentState: {
        retentionStatus: 'HEALTHY',
        cooldownUntil: new Date('2026-03-10T00:00:00.000Z'),
      },
      now,
    });

    expect(transition.action).toBe('NO_CHANGE');
    expect(transition.eventType).toBeNull();
  });
});

describe('runDailyRiskDetection idempotency and state transitions', () => {
  test('runs twice for same day without duplicate outbox or snapshot', async () => {
    const customer = await createCustomer('idempotent');
    const scoreDate = '2026-03-02';
    const predictor = async (records) => ({
      probabilities: records.map(() => 0.9),
      modelVersion: 'test-model',
    });

    await riskDetectionAgentService.runDailyRiskDetection(scoreDate, { predictor });
    await riskDetectionAgentService.runDailyRiskDetection(scoreDate, { predictor });

    const snapshotCount = await CustomerRiskSnapshot.countDocuments({ customer: customer._id });
    const outboxCount = await EventOutbox.countDocuments({
      eventType: 'customer.at_risk',
      'payload.customerId': String(customer._id),
    });

    expect(snapshotCount).toBe(1);
    expect(outboxCount).toBe(1);
  });

  test('updates retention state to AT_RISK and emits event', async () => {
    const customer = await createCustomer('atrisk');
    const predictor = async (records) => ({
      probabilities: records.map(() => 0.82),
      modelVersion: 'test-model',
    });

    await riskDetectionAgentService.runDailyRiskDetection('2026-03-02', { predictor });

    const state = await CustomerRetentionState.findOne({ customer: customer._id }).lean();
    const outbox = await EventOutbox.findOne({
      eventType: 'customer.at_risk',
      'payload.customerId': String(customer._id),
    }).lean();

    expect(state).toBeTruthy();
    expect(state.retentionStatus).toBe('AT_RISK');
    expect(state.followUpStage).toBe(0);
    expect(state.nextFollowUpAt).toBeTruthy();
    expect(outbox).toBeTruthy();
  });

  test('moves customer to RECOVERED and sets cooldown', async () => {
    const customer = await createCustomer('recover');
    await CustomerRetentionState.create({
      customer: customer._id,
      retentionStatus: 'AT_RISK',
      followUpStage: 2,
    });
    const predictor = async (records) => ({
      probabilities: records.map(() => 0.2),
      modelVersion: 'test-model',
    });

    await riskDetectionAgentService.runDailyRiskDetection('2026-03-02', { predictor });

    const state = await CustomerRetentionState.findOne({ customer: customer._id }).lean();
    const outbox = await EventOutbox.findOne({
      eventType: 'customer.recovered',
      'payload.customerId': String(customer._id),
    }).lean();

    expect(state.retentionStatus).toBe('RECOVERED');
    expect(state.followUpStage).toBe(0);
    expect(state.nextFollowUpAt).toBeNull();
    expect(new Date(state.cooldownUntil).getTime()).toBeGreaterThan(Date.now());
    expect(outbox).toBeTruthy();
  });

  test('does not trigger AT_RISK while customer is in cooldown', async () => {
    const customer = await createCustomer('cooldown');
    await CustomerRetentionState.create({
      customer: customer._id,
      retentionStatus: 'HEALTHY',
      followUpStage: 0,
      cooldownUntil: new Date(Date.now() + (5 * 24 * 60 * 60 * 1000)),
    });
    const predictor = async (records) => ({
      probabilities: records.map(() => 0.95),
      modelVersion: 'test-model',
    });

    await riskDetectionAgentService.runDailyRiskDetection('2026-03-02', { predictor });

    const state = await CustomerRetentionState.findOne({ customer: customer._id }).lean();
    const outbox = await EventOutbox.find({
      'payload.customerId': String(customer._id),
    }).lean();

    expect(state.retentionStatus).toBe('HEALTHY');
    expect(outbox.length).toBe(0);
  });
});

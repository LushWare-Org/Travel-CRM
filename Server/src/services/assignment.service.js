import Settings from '../models/settings.model.js';
import User from '../models/user.model.js';
import Lead from '../models/lead.model.js';

async function getEligibleSalesReps(config) {
  const baseQuery = { role: 'salesRep', isActive: true };

  // Filter by enabled sales reps if specified
  if (config.enabledSalesReps && config.enabledSalesReps.length > 0) {
    baseQuery._id = { $in: config.enabledSalesReps };
  }

  // Filter by 1-hour login activity if setting is enabled
  if (config.requireActiveLogin48h === true) {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    baseQuery.lastLogin = { $gte: oneHourAgo };
  }

  return User.find(baseQuery).select('name email lastLogin');
}

async function pickRoundRobin(reps, settingsDoc) {
  if (reps.length === 0) return null;
  const index = settingsDoc.roundRobinIndex % reps.length;
  // advance atomically
  await settingsDoc.updateOne({ $inc: { roundRobinIndex: 1 } });
  // refresh updated index not needed for selection
  return reps[index];
}

async function pickLoadBased(reps, config) {
  if (reps.length === 0) return null;
  const repIds = reps.map((r) => r._id);
  const openStatuses = ['new', 'contacted', 'interested', 'quoted'];
  const counts = await Lead.aggregate([
    { $match: { assignedTo: { $in: repIds }, status: { $in: openStatuses } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
  ]);
  const idToCount = new Map(counts.map((c) => [String(c._id), c.count]));
  let best = null;
  let bestCount = Infinity;
  reps.forEach((rep) => {
    const c = idToCount.get(String(rep._id)) || 0;
    if (c < bestCount && c < (config.maxOpenLeadsPerRep || 1e9)) {
      best = rep;
      bestCount = c;
    }
  });
  return best;
}

export async function assignSalesRepIfNeeded(leadDraft) {
  const settingsDoc = await Settings.getSingleton();
  const config = settingsDoc.toObject();

  if (config.assignmentMode !== 'auto') return { assigned: false };

  const reps = await getEligibleSalesReps(config);
  if (!reps || reps.length === 0) return { assigned: false };

  let chosen = null;
  if (config.autoStrategy === 'round_robin') {
    chosen = await pickRoundRobin(reps, settingsDoc);
  } else {
    chosen = await pickLoadBased(reps, config);
  }

  if (!chosen) return { assigned: false };

  leadDraft.assignedTo = chosen._id;
  leadDraft.assignmentMode = 'auto';
  leadDraft.assignedBy = null;
  return { assigned: true, salesRepId: chosen._id, salesRep: chosen };
}

export default { assignSalesRepIfNeeded };

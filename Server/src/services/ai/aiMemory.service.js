import AIMemory from '../../models/aiMemory.model.js';

class AIMemoryService {
  async getLatest(scopeType, scopeId, memoryType) {
    return AIMemory.findOne({ scopeType, scopeId: String(scopeId), memoryType }).sort({ updatedAt: -1 }).lean();
  }

  async list(scopeType, scopeId, memoryType, limit = 20) {
    const query = { scopeType, scopeId: String(scopeId) };
    if (memoryType) {
      query.memoryType = memoryType;
    }
    return AIMemory.find(query).sort({ updatedAt: -1 }).limit(limit).lean();
  }

  async upsertMemory({
    scopeType,
    scopeId,
    memoryType,
    summary,
    content,
    lastAgent,
    confidence = 0.5,
    tags = [],
    expiresAt,
  }) {
    return AIMemory.findOneAndUpdate(
      { scopeType, scopeId: String(scopeId), memoryType },
      {
        scopeType,
        scopeId: String(scopeId),
        memoryType,
        summary,
        content,
        lastAgent,
        confidence,
        tags,
        expiresAt,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
}

export default new AIMemoryService();

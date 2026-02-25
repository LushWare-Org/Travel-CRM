import AIAgentControl from '../../models/aiAgentControl.model.js';

class AIAgentControlService {
  async getControl(agentName) {
    let control = await AIAgentControl.findOne({ agentName });
    if (!control) {
      control = await AIAgentControl.create({
        agentName,
        isPaused: false,
        requiresHumanApproval: false,
      });
    }
    return control;
  }

  async setPause(agentName, isPaused, userId, pauseReason = '') {
    return AIAgentControl.findOneAndUpdate(
      { agentName },
      {
        agentName,
        isPaused,
        pauseReason,
        updatedBy: userId,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async setHumanApproval(agentName, requiresHumanApproval, userId) {
    return AIAgentControl.findOneAndUpdate(
      { agentName },
      {
        agentName,
        requiresHumanApproval,
        updatedBy: userId,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async listControls() {
    return AIAgentControl.find().sort({ agentName: 1 }).lean();
  }
}

export default new AIAgentControlService();

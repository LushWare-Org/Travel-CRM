class BaseAgent {
  constructor(name) {
    this.name = name;
  }

  shouldHandle() {
    return false;
  }

  async execute() {
    throw new Error('execute() must be implemented by agent');
  }
}

export default BaseAgent;

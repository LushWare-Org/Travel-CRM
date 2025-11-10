import Joi from 'joi';

export const updateSettingsSchema = Joi.object({
  assignmentMode: Joi.string().valid('manual', 'auto'),
  autoStrategy: Joi.string().valid('round_robin', 'load_based'),
  enabledSalesReps: Joi.array().items(Joi.string().hex().length(24)),
  roundRobinIndex: Joi.number().integer().min(0),
  maxOpenLeadsPerRep: Joi.number().integer().min(1),
  skipInactive: Joi.boolean(),
});



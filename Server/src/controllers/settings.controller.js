import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import Settings from '../models/settings.model.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.status(200).json({ success: true, data: settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();

  const updatable = [
    'assignmentMode',
    'autoStrategy',
    'enabledSalesReps',
    'roundRobinIndex',
    'maxOpenLeadsPerRep',
    'skipInactive',
    'requireActiveLogin48h',
  ];

  updatable.forEach((key) => {
    if (req.body[key] !== undefined) settings[key] = req.body[key];
  });

  settings.updatedBy = req.user?._id || settings.updatedBy;
  await settings.save();

  res.status(200).json({ success: true, data: settings });
});

export default { getSettings, updateSettings };



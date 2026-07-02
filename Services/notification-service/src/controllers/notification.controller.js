import asyncHandler from '../utils/asyncHandler.js';

export const getNotifications = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [], message: 'In-app notifications coming soon' });
});

export const markAsRead = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Marked as read' });
});

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['booking', 'payment', 'reminder', 'promo'],
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  sentAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['sent', 'pending', 'failed'],
    required: true,
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ userId: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ sentAt: -1 });

// Compound index for user notifications
notificationSchema.index({ userId: 1, sentAt: -1 });

// Virtual for formatted sent date
notificationSchema.virtual('formattedSentDate').get(function() {
  return this.sentAt.toLocaleString();
});

// Virtual for notification age
notificationSchema.virtual('ageInHours').get(function() {
  const now = new Date();
  const diffInMs = now - this.sentAt;
  return Math.floor(diffInMs / (1000 * 60 * 60));
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

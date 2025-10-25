import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  visitors: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  pageViews: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  bookingsCount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  leadsCount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  topDestinations: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
analyticsSchema.index({ date: -1 });
analyticsSchema.index({ visitors: -1 });
analyticsSchema.index({ bookingsCount: -1 });

// Virtual for conversion rate
analyticsSchema.virtual('conversionRate').get(function() {
  if (this.visitors === 0) return 0;
  return ((this.bookingsCount / this.visitors) * 100).toFixed(2);
});

// Virtual for average page views per visitor
analyticsSchema.virtual('avgPageViewsPerVisitor').get(function() {
  if (this.visitors === 0) return 0;
  return (this.pageViews / this.visitors).toFixed(2);
});

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics;

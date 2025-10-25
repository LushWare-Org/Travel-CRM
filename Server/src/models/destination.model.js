import mongoose from 'mongoose';

const destinationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  region: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  bestSeason: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  popular: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
destinationSchema.index({ name: 1 });
destinationSchema.index({ country: 1 });
destinationSchema.index({ region: 1 });
destinationSchema.index({ popular: 1 });

// Virtual for full location
destinationSchema.virtual('fullLocation').get(function() {
  return `${this.name}, ${this.region}, ${this.country}`;
});

const Destination = mongoose.model('Destination', destinationSchema);

export default Destination;

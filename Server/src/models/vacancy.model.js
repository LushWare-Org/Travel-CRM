import mongoose from 'mongoose';

const vacancySchema = new mongoose.Schema(
  {
    position: {
      type: String,
      required: [true, 'Position name is required'],
      trim: true,
      maxlength: [100, 'Position cannot be more than 100 characters'],
    },
    
    description: {
      type: String,
      required: [true, 'Job description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    type: {
      type: String,
      enum: ['Full Time', 'Part Time', 'Contract', 'Temporary', 'Internship'],
      default: 'Full Time',
    },

    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },

    experience: {
      min: {
        type: Number,
        default: 0,
      },
    },

    status: {
      type: String,
      enum: ['active', 'closed', 'draft'],
      default: 'draft',
    },

    applicationsCount: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    closingDate: {
      type: Date,
      required: false,
    },

  },
  {
    timestamps: true,
  }
);

vacancySchema.index({ status: 1, createdAt: -1 });
vacancySchema.index({ position: 1 });

const Vacancy = mongoose.model('Vacancy', vacancySchema);
export default Vacancy;

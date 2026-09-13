import mongoose from 'mongoose';

const careerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*([.]\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      match: [
        /^\+?[1-9]\d{1,14}$/,
        'Please provide a valid international phone number',
      ],
    },

    position: {
      type: String,
      required: [true, 'Position selection is required'],
    },

    resume: {
      url: String,
      fileName: String,
    },

    coverLetter: {
      type: String,
      required: [true, 'Cover letter is required'],
      maxlength: [2000, 'Cover letter cannot exceed 2000 characters'],
    },

    agreeTerms: {
      type: Boolean,
      required: [true, 'You must agree to the terms'],
    },
    status: {
      type: String,
      enum: ['pending', 'under-review', 'shortlisted', 'rejected', 'hired'],
      default: 'pending',
    },

    adminNotes: {
      type: String,
      maxlength: [2000, 'Admin notes cannot exceed 2000 characters'],
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    reviewedAt: Date,

    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: Date,
  },
  {
    timestamps: true,
  }
);

careerSchema.index({ email: 1 });
careerSchema.index({ position: 1 });
careerSchema.index({ status: 1 });
careerSchema.index({ createdAt: -1 });

careerSchema.pre('save', function (next) {
  if (this.phone && !this.phone.startsWith('+')) {
    this.phone = '+91' + this.phone.replace(/\D/g, '');
  }
  next();
});

export default mongoose.model('Career', careerSchema);

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*([.]\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    phone: {
      type: String,
      // Accepts international format: +1 (234) 567-8900 or +1234567890
      match: [
        /^\+?[1-9]\d{1,14}$/,
        'Please provide a valid international phone number (E.164 format)',
      ],
      sparse: true,
    },
    phoneCountry: {
      type: String,
      // ISO 3166-1 alpha-2 country code (e.g., 'US', 'LK', 'IN')
      match: [/^[A-Z]{2}$/, 'Please provide a valid country code'],
      sparse: true,
      default: 'US', // Default to US
    },
    phoneE164: {
      type: String,
      // Stores the normalized E.164 format for consistent lookups
      sparse: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['customer', 'salesRep', 'vendor', 'admin', 'superAdmin'],
      default: 'customer',
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
      // Only superAdmins can have this flag set to true
      validate: {
        validator(value) {
          // If isSuperAdmin is true, role must be 'superAdmin'
          return !value || this.role === 'superAdmin';
        },
        message: 'Only users with superAdmin role can have isSuperAdmin flag set to true',
      },
    },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator(permissionsArray) {
          const validPermissions = [
            'manage_users',
            'manage_sales_reps',
            'manage_vendors',
            'manage_admins',
            'view_reports',
            'manage_billing',
            'system_settings',
            'audit_log',
          ];
          return permissionsArray.every((perm) => validPermissions.includes(perm));
        },
        message: 'Invalid permission specified',
      },
    },
    avatar: {
      public_id: String,
      url: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isTempPassword: {
      type: Boolean,
      default: false,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    passwordChangedAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: Date,
    // Vendor-specific fields
    businessName: {
      type: String,
      trim: true,
    },
    serviceType: {
      type: String,
      enum: ['hotel', 'transport', 'activity', 'restaurant', 'guide', 'other'],
    },
    businessRegistrationNumber: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    taxIdentificationNumber: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    contactPerson: {
      name: String,
      phone: String,
      email: String,
      designation: String,
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      branchName: String,
      ifscCode: String,
      swiftCode: String,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    vendorStatus: {
      type: String,
      enum: ['pending_verification', 'verified', 'suspended', 'rejected'],
      default: 'pending_verification',
    },
    canBeDeleted: {
      type: Boolean,
      default: true,
      // SuperAdmin cannot be deleted
    },
  },
  {
    timestamps: true,
  },
);

// Normalize role: convert 'superAdmin' to 'admin' (legacy support)
userSchema.pre('save', function normalizeRole(next) {
  if (this.role === 'superAdmin') {
    this.role = 'admin';
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS, 10) || 12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Check if password changed after token was issued
userSchema.methods.changedPasswordAfter = function changedPasswordAfter(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function getSignedJwtToken() {
  return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Generate password reset token
userSchema.methods.getResetPasswordToken = function getResetPasswordToken() {
  const resetToken = crypto.randomBytes(20).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Generate email verification token
userSchema.methods.getEmailVerificationToken = function getEmailVerificationToken() {
  const verificationToken = crypto.randomBytes(20).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return verificationToken;
};

export default mongoose.model('User', userSchema);

import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  siteName: {
    type: String,
    required: true,
    trim: true,
    default: 'Trip Sky Way'
  },
  logoUrl: {
    type: String,
    required: true,
    default: '/images/logo.png'
  },
  themeColors: {
    primary: {
      type: String,
      required: true,
      default: '#3B82F6'
    },
    secondary: {
      type: String,
      required: true,
      default: '#1E40AF'
    },
    accent: {
      type: String,
      required: true,
      default: '#F59E0B'
    }
  },
  currencyOptions: [{
    type: String,
    trim: true
  }],
  languagesSupported: [{
    type: String,
    trim: true
  }],
  contactInfo: {
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    whatsapp: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
settingsSchema.index({ siteName: 1 });

// Virtual for formatted contact info
settingsSchema.virtual('formattedContact').get(function() {
  return {
    phone: this.contactInfo.phone,
    email: this.contactInfo.email,
    whatsapp: this.contactInfo.whatsapp,
    address: this.contactInfo.address
  };
});

// Virtual for theme CSS variables
settingsSchema.virtual('themeCSS').get(function() {
  return {
    '--primary-color': this.themeColors.primary,
    '--secondary-color': this.themeColors.secondary,
    '--accent-color': this.themeColors.accent
  };
});

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;

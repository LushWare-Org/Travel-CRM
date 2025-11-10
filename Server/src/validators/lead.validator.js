import Joi from 'joi';

// Create lead validation
export const createLeadSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
    }),
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
    }),
  phone: Joi.string()
    .required()
    .messages({
      'string.empty': 'Phone number is required',
    }),
  whatsapp: Joi.string()
    .allow('', null)
    .messages({
      'string.empty': 'WhatsApp number is optional',
    }),
  city: Joi.string()
    .trim()
    .allow('', null)
    .messages({
      'string.base': 'City must be a string',
    }),
  salesRep: Joi.string()
    .trim()
    .allow('', null)
    .messages({
      'string.base': 'Sales Rep must be a string',
    }),
  fromCountry: Joi.string()
    .trim()
    .allow('', null)
    .messages({
      'string.base': 'From country must be a string',
    }),
  destinationCountry: Joi.string()
    .trim()
    .allow('', null)
    .messages({
      'string.base': 'Destination country must be a string',
    }),
  destination: Joi.string()
    .trim()
    .allow('', null)
    .messages({
      'string.base': 'Destination must be a string',
    }),
  source: Joi.string()
    .valid('manual', 'website', 'booking', 'social-media', 'phone-call', 'email', 'referral', 'walk-in', 'other')
    .default('manual')
    .messages({
      'any.only': 'Source must be one of: manual, website, booking, social-media, phone-call, email, referral, walk-in, other',
    }),
  platform: Joi.string()
    .valid('Manual Entry', 'Website Form', 'Paid Package', 'Social Media', 'Phone Call', 'Email', 'Referral', 'Walk-in')
    .default('Manual Entry')
    .messages({
      'any.only': 'Platform must be one of: Manual Entry, Website Form, Paid Package, Social Media, Phone Call, Email, Referral, Walk-in',
    }),
  travelDate: Joi.date()
    .allow(null)
    .messages({
      'date.base': 'Travel date must be a valid date',
    }),
  leadDateTime: Joi.date()
    .default(Date.now)
    .messages({
      'date.base': 'Lead date/time must be a valid date',
    }),
  time: Joi.string()
    .trim()
    .allow('', null)
    .messages({
      'string.base': 'Time must be a string',
    }),
  numberOfTravelers: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .messages({
      'number.base': 'Number of travelers must be a number',
      'number.min': 'Number of travelers must be at least 1',
    }),
  budget: Joi.string()
    .trim()
    .allow('', null)
    .messages({
      'string.base': 'Budget must be a string',
    }),
  message: Joi.string()
    .trim()
    .allow('', null)
    .messages({
      'string.base': 'Message must be a string',
    }),
  status: Joi.string()
    .valid('new', 'contacted', 'interested', 'quoted', 'converted', 'lost', 'not-interested')
    .default('new')
    .messages({
      'any.only': 'Status must be one of: new, contacted, interested, quoted, converted, lost, not-interested',
    }),
  priority: Joi.string()
    .valid('low', 'medium', 'high')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high',
    }),
  assignedTo: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .messages({
      'string.pattern.base': 'assignedTo must be a valid ObjectId',
    }),
  package: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Package must be a valid ObjectId',
    }),
  packageName: Joi.string()
    .trim()
    .allow(null, '')
    .messages({
      'string.base': 'Package name must be a string',
    }),
  remarks: Joi.array()
    .items(
      Joi.object({
        text: Joi.string().trim().required(),
        date: Joi.date().default(Date.now),
      }),
    )
    .optional()
    .messages({
      'array.base': 'Remarks must be an array',
    }),
});

// Update lead validation (all fields optional)
export const updateLeadSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
    }),
  email: Joi.string()
    .email()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  phone: Joi.string().messages({
    'string.base': 'Phone must be a string',
  }),
  whatsapp: Joi.string().allow('', null),
  city: Joi.string().trim().allow('', null),
  salesRep: Joi.string().trim().allow('', null),
  fromCountry: Joi.string().trim().allow('', null),
  destinationCountry: Joi.string().trim().allow('', null),
  destination: Joi.string().trim().allow('', null),
  source: Joi.string()
    .valid('manual', 'website', 'booking', 'social-media', 'phone-call', 'email', 'referral', 'walk-in', 'other')
    .messages({
      'any.only': 'Source must be one of: manual, website, booking, social-media, phone-call, email, referral, walk-in, other',
    }),
  platform: Joi.string()
    .valid('Manual Entry', 'Website Form', 'Paid Package', 'Social Media', 'Phone Call', 'Email', 'Referral', 'Walk-in')
    .messages({
      'any.only': 'Platform must be one of: Manual Entry, Website Form, Paid Package, Social Media, Phone Call, Email, Referral, Walk-in',
    }),
  travelDate: Joi.date().allow(null),
  leadDateTime: Joi.date(),
  time: Joi.string().trim().allow('', null),
  numberOfTravelers: Joi.number().integer().min(1).allow(null),
  budget: Joi.string().trim().allow('', null),
  message: Joi.string().trim().allow('', null),
  status: Joi.string()
    .valid('new', 'contacted', 'interested', 'quoted', 'converted', 'lost', 'not-interested')
    .messages({
      'any.only': 'Status must be one of: new, contacted, interested, quoted, converted, lost, not-interested',
    }),
  priority: Joi.string()
    .valid('low', 'medium', 'high')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high',
    }),
  assignedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null),
  package: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Package must be a valid ObjectId',
    }),
  packageName: Joi.string()
    .trim()
    .allow(null, '')
    .messages({
      'string.base': 'Package name must be a string',
    }),
  remarks: Joi.array()
    .items(
      Joi.object({
        text: Joi.string().trim().required(),
        date: Joi.date().default(Date.now),
      }),
    )
    .messages({
      'array.base': 'Remarks must be an array',
    }),
  statusChangeNotes: Joi.string().trim().allow('', null),
});

// Add remark validation
export const addRemarkSchema = Joi.object({
  text: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      'string.empty': 'Remark text is required',
      'string.min': 'Remark text cannot be empty',
    }),
  date: Joi.date()
    .default(Date.now)
    .messages({
      'date.base': 'Date must be a valid date',
    }),
});

// Assign lead validation
export const assignLeadSchema = Joi.object({
  assignedTo: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.empty': 'Assigned user ID is required',
      'string.pattern.base': 'assignedTo must be a valid ObjectId',
    }),
});



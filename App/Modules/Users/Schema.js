// modules/user/schema.js
const mongoose = require('mongoose');
let schema = mongoose.Schema;

// User preferences schema
const userPreferencesSchema = new schema({
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    marketing: { type: Boolean, default: false }
  },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' }
});

const user = new mongoose.Schema({
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['SuperAdmin', 'IndustryAdmin', 'IndustryMember', 'Professional', 'Vendor', 'Support'] 
  },
  profileId: { type: schema.Types.ObjectId, required: true },
  isProfile: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  preferences: { type: userPreferencesSchema, default: () => ({}) },
  // Authentication fields
  passwordResetToken: { type: String },
  passwordResetExpiry: { type: Date },
  emailVerificationToken: { type: String },
  emailVerificationExpiry: { type: Date },
  phoneVerificationCode: { type: String },
  phoneVerificationExpiry: { type: Date },
  lastLoginAt: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  isActive: { type: Boolean, default: true },
  deactivatedAt: { type: Date },
  deactivationReason: { type: String }

},
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  });

// Create indexes for Users
user.index({ email: 1 }, { unique: true });
user.index({ role: 1 });
user.index({ profileId: 1 });
user.index({ isEmailVerified: 1, isPhoneVerified: 1 });
user.index({ passwordResetToken: 1 });
user.index({ emailVerificationToken: 1 });
user.index({ lastLoginAt: -1 });
user.index({ isActive: 1 });

const UserSchema = mongoose.model('User', user);

let authtokensSchema = new schema({
  userId: { type: schema.Types.ObjectId, ref: 'Users' },
  adminId: { type: schema.Types.ObjectId, ref: 'Admin' },
  refreshToken: { type: Buffer },
  role: { type: String },
  access_tokens: [{
    token: { type: Buffer },
    tokenExpiryTime: { type: Date },
    deviceId: { type: String },
    ipAddress: { type: String },
  }]
},
  { timestamps: true });

// Create indexes for Authtokens
authtokensSchema.index({ userId: 1 });
authtokensSchema.index({ adminId: 1 });
authtokensSchema.index({ 'access_tokens.token': 1 });
authtokensSchema.index({ 'access_tokens.tokenExpiryTime': 1 });

let Authtokens = mongoose.model('authtokens', authtokensSchema);

// Industry Schema (for backward compatibility)
const industrySchema = new schema({
  accountType: { type: String, required: true },
  companyName: { type: String, required: true, unique: true },
  industryType: { type: String, required: true },
  termsAccepted: { type: Boolean, required: true }
}, {
  timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" }
});

const IndustrySchema = mongoose.model('Industry', industrySchema);

module.exports = {
  UserSchema,
  Authtokens,
  IndustrySchema
}


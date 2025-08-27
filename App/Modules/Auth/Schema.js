const mongoose = require('mongoose');
const { Schema } = mongoose;

// Role Schema
const roleSchema = new Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    enum: ['SuperAdmin', 'IndustryAdmin', 'IndustryMember', 'Professional', 'Vendor', 'Support']
  },
  displayName: { type: String, required: true },
  description: { type: String },
  permissions: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isSystemRole: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Permission Schema
const permissionSchema = new Schema({
  name: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  description: { type: String },
  module: { type: String, required: true },
  action: { type: String, required: true },
  resource: { type: String, required: true }
}, {
  timestamps: true
});

// User Profile Schema (Extended from existing User schema)
const userProfileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  avatar: { type: String },
  bio: { type: String, maxlength: 500 },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    zipCode: { type: String }
  },
  socialLinks: {
    linkedin: { type: String },
    twitter: { type: String },
    website: { type: String }
  },
  emergencyContact: {
    name: { type: String },
    relationship: { type: String },
    phone: { type: String },
    email: { type: String }
  },
  isProfileComplete: { type: Boolean, default: false },
  profileCompletionPercentage: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Company Schema (for linking users to companies)
const companySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  displayName: { type: String, trim: true },
  description: { type: String },
  industry: { type: String },
  size: { 
    type: String, 
    enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'] 
  },
  website: { type: String },
  logo: { type: String },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    zipCode: { type: String }
  },
  contactInfo: {
    phone: { type: String },
    email: { type: String },
    fax: { type: String }
  },
  registrationInfo: {
    registrationNumber: { type: String },
    taxId: { type: String },
    incorporationDate: { type: Date }
  },
  adminUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    role: { type: String },
    joinedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false }
}, {
  timestamps: true
});

// MFA Schema
const mfaSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  isEnabled: { type: Boolean, default: false },
  methods: [{
    type: { 
      type: String, 
      enum: ['sms', 'email', 'authenticator'], 
      required: true 
    },
    value: { type: String }, // phone number, email, or secret key
    isVerified: { type: Boolean, default: false },
    isPrimary: { type: Boolean, default: false }
  }],
  backupCodes: [{
    code: { type: String, required: true },
    isUsed: { type: Boolean, default: false },
    usedAt: { type: Date }
  }],
  lastVerifiedAt: { type: Date }
}, {
  timestamps: true
});

// Password History Schema
const passwordHistorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Social Login Schema
const socialLoginSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { 
    type: String, 
    enum: ['google', 'linkedin', 'microsoft'], 
    required: true 
  },
  providerId: { type: String, required: true },
  email: { type: String },
  name: { type: String },
  avatar: { type: String },
  accessToken: { type: String },
  refreshToken: { type: String },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// User Approval Workflow Schema
const userApprovalSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'documents_required', 'under_review', 'approved', 'rejected'], 
    default: 'pending' 
  },
  steps: [{
    stepName: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'skipped'], 
      default: 'pending' 
    },
    completedAt: { type: Date },
    notes: { type: String }
  }],
  documents: [{
    name: { type: String, required: true },
    type: { type: String, required: true },
    url: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending' 
    },
    uploadedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    comments: { type: String }
  }],
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  notes: { type: String }
}, {
  timestamps: true
});

// Role Request Schema
const roleRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestedRole: { type: String, required: true },
  currentRole: { type: String, required: true },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  notes: { type: String }
}, {
  timestamps: true
});

// Create indexes
roleSchema.index({ name: 1 });
roleSchema.index({ isActive: 1 });

permissionSchema.index({ name: 1 });
permissionSchema.index({ module: 1, action: 1 });

userProfileSchema.index({ userId: 1 });
userProfileSchema.index({ isProfileComplete: 1 });

companySchema.index({ name: 1 });
companySchema.index({ adminUserId: 1 });
companySchema.index({ 'members.userId': 1 });

mfaSchema.index({ userId: 1 });
passwordHistorySchema.index({ userId: 1, createdAt: -1 });

socialLoginSchema.index({ userId: 1, provider: 1 });
socialLoginSchema.index({ provider: 1, providerId: 1 });

userApprovalSchema.index({ userId: 1 });
userApprovalSchema.index({ status: 1 });

roleRequestSchema.index({ userId: 1, status: 1 });
roleRequestSchema.index({ requestedBy: 1 });

// Export models
const Role = mongoose.model('Role', roleSchema);
const Permission = mongoose.model('Permission', permissionSchema);
const UserProfile = mongoose.model('UserProfile', userProfileSchema);
const Company = mongoose.model('Company', companySchema);
const MFA = mongoose.model('MFA', mfaSchema);
const PasswordHistory = mongoose.model('PasswordHistory', passwordHistorySchema);
const SocialLogin = mongoose.model('SocialLogin', socialLoginSchema);
const UserApproval = mongoose.model('UserApproval', userApprovalSchema);
const RoleRequest = mongoose.model('RoleRequest', roleRequestSchema);

module.exports = {
  Role,
  Permission,
  UserProfile,
  Company,
  MFA,
  PasswordHistory,
  SocialLogin,
  UserApproval,
  RoleRequest
};
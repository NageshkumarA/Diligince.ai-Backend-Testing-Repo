const mongoose = require("mongoose");
const { Schema } = mongoose;

/* -------------------- Role Schema -------------------- */
const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "SuperAdmin",
        "IndustryAdmin",
        "IndustryMember",
        "Professional",
        "Vendor",
        "Support",
      ],
    },
    displayName: { type: String, required: true },
    description: { type: String },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isSystemRole: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Additional index for filtering by active roles
roleSchema.index({ isActive: 1 });

/* -------------------- Permission Schema -------------------- */
const permissionSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    description: { type: String },
    module: { type: String, required: true },
    action: { type: String, required: true },
    resource: { type: String, required: true },
  },
  { timestamps: true }
);

// Compound index for module + action lookups
permissionSchema.index({ module: 1, action: 1 });

/* -------------------- UserProfile Schema -------------------- */
const userProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    avatar: { type: String },
    bio: { type: String, maxlength: 500 },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
    },
    socialLinks: {
      linkedin: { type: String },
      twitter: { type: String },
      website: { type: String },
    },
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    isProfileComplete: { type: Boolean, default: false },
    profileCompletionPercentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for quickly filtering complete profiles
userProfileSchema.index({ isProfileComplete: 1 });

/* -------------------- Company Schema -------------------- */
const companySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, trim: true },
    description: { type: String },
    industry: { type: String },
    size: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-1000", "1000+"],
    },
    website: { type: String },
    logo: { type: String },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      zipCode: { type: String },
    },
    contactInfo: {
      phone: { type: String },
      email: { type: String },
      fax: { type: String },
    },
    registrationInfo: {
      registrationNumber: { type: String },
      taxId: { type: String },
      incorporationDate: { type: Date },
    },
    adminUserId: { type: Schema.Types.ObjectId, ref: "User" },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        role: { type: String },
        joinedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
      },
    ],
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for faster lookups
companySchema.index({ adminUserId: 1 });
companySchema.index({ "members.userId": 1 });

/* -------------------- MFA Schema -------------------- */
const mfaSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    isEnabled: { type: Boolean, default: false },
    methods: [
      {
        type: {
          type: String,
          enum: ["sms", "email", "authenticator"],
          required: true,
        },
        value: { type: String },
        isVerified: { type: Boolean, default: false },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    backupCodes: [
      {
        code: { type: String, required: true },
        isUsed: { type: Boolean, default: false },
        usedAt: { type: Date },
      },
    ],
    lastVerifiedAt: { type: Date },
  },
  { timestamps: true }
);

/* -------------------- PasswordHistory Schema -------------------- */
const passwordHistorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Index to quickly fetch recent passwords
passwordHistorySchema.index({ userId: 1, createdAt: -1 });

/* -------------------- SocialLogin Schema -------------------- */
const socialLoginSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    provider: {
      type: String,
      enum: ["google", "linkedin", "microsoft"],
      required: true,
    },
    providerId: { type: String, required: true },
    email: { type: String },
    name: { type: String },
    avatar: { type: String },
    accessToken: { type: String },
    refreshToken: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for fast provider lookups
socialLoginSchema.index({ userId: 1, provider: 1 });
socialLoginSchema.index({ provider: 1, providerId: 1 });

/* -------------------- UserApproval Schema -------------------- */
const userApprovalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "documents_required",
        "under_review",
        "approved",
        "rejected",
      ],
      default: "pending",
    },
    steps: [
      {
        stepName: { type: String, required: true },
        status: {
          type: String,
          enum: ["pending", "completed", "skipped"],
          default: "pending",
        },
        completedAt: { type: Date },
        notes: { type: String },
      },
    ],
    documents: [
      {
        name: { type: String, required: true },
        type: { type: String, required: true },
        url: { type: String, required: true },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        uploadedAt: { type: Date, default: Date.now },
        reviewedAt: { type: Date },
        reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
        comments: { type: String },
      },
    ],
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

userApprovalSchema.index({ status: 1 });

/* -------------------- RoleRequest Schema -------------------- */
const roleRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedRole: { type: String, required: true },
    currentRole: { type: String, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

roleRequestSchema.index({ userId: 1, status: 1 });
roleRequestSchema.index({ requestedBy: 1 });

/* -------------------- Export Models -------------------- */
module.exports = {
  Role: mongoose.model("Role", roleSchema),
  Permission: mongoose.model("Permission", permissionSchema),
  UserProfile: mongoose.model("UserProfile", userProfileSchema),
  Company: mongoose.model("Company", companySchema),
  MFA: mongoose.model("MFA", mfaSchema),
  PasswordHistory: mongoose.model("PasswordHistory", passwordHistorySchema),
  SocialLogin: mongoose.model("SocialLogin", socialLoginSchema),
  UserApproval: mongoose.model("UserApproval", userApprovalSchema),
  RoleRequest: mongoose.model("RoleRequest", roleRequestSchema),
};

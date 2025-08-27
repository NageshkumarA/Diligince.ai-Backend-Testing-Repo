const mongoose = require('mongoose');
const { Schema } = mongoose;

// Custom Role Schema (for user-created roles)
const customRoleSchema = new Schema({
  name: { type: String, required: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  companyId: { type: Schema.Types.ObjectId, required: true }, // Links to Company/Industry/Vendor
  companyType: { 
    type: String, 
    enum: ['industry', 'vendor'], 
    required: true 
  },
  permissions: [{
    module: { type: String, required: true },
    actions: [{ type: String }], // ['create', 'read', 'update', 'delete', 'approve']
    level: { 
      type: String, 
      enum: ['none', 'own', 'team', 'company', 'all'], 
      default: 'own' 
    }
  }],
  isActive: { type: Boolean, default: true },
  isSystemRole: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Sub User Schema (users created by admins)
const subUserSchema = new Schema({
  parentUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: Schema.Types.ObjectId, required: true },
  companyType: { 
    type: String, 
    enum: ['industry', 'vendor'], 
    required: true 
  },
  email: { type: String, required: true, unique: true, lowercase: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  customRole: { type: Schema.Types.ObjectId, ref: 'CustomRole' },
  systemRole: { 
    type: String, 
    enum: ['IndustryMember', 'VendorMember', 'TeamLead', 'Manager'] 
  },
  department: { type: String, trim: true },
  position: { type: String, trim: true },
  reportingTo: { type: Schema.Types.ObjectId, ref: 'SubUser' },
  permissions: [{
    module: { type: String, required: true },
    actions: [{ type: String }],
    level: { 
      type: String, 
      enum: ['none', 'own', 'team', 'company', 'all'], 
      default: 'own' 
    }
  }],
  status: { 
    type: String, 
    enum: ['pending', 'active', 'inactive', 'suspended'], 
    default: 'pending' 
  },
  invitationToken: { type: String },
  invitationExpiry: { type: Date },
  lastLogin: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  temporaryPassword: { type: String },
  passwordChangeRequired: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Role Assignment History Schema
const roleAssignmentHistorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  userType: { 
    type: String, 
    enum: ['User', 'SubUser'], 
    required: true 
  },
  previousRole: {
    type: { type: String, enum: ['system', 'custom'] },
    roleId: { type: Schema.Types.ObjectId },
    roleName: { type: String }
  },
  newRole: {
    type: { type: String, enum: ['system', 'custom'] },
    roleId: { type: Schema.Types.ObjectId },
    roleName: { type: String }
  },
  reason: { type: String, trim: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: Schema.Types.ObjectId, required: true },
  effectiveDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Permission Template Schema (predefined permission sets)
const permissionTemplateSchema = new Schema({
  name: { type: String, required: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: { 
    type: String, 
    enum: ['basic', 'advanced', 'manager', 'admin'], 
    default: 'basic' 
  },
  permissions: [{
    module: { type: String, required: true },
    actions: [{ type: String }],
    level: { 
      type: String, 
      enum: ['none', 'own', 'team', 'company', 'all'], 
      default: 'own' 
    }
  }],
  isSystemTemplate: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// User Approval Request Schema
const userApprovalRequestSchema = new Schema({
  requestType: { 
    type: String, 
    enum: ['user_creation', 'role_change', 'permission_change', 'status_change'], 
    required: true 
  },
  targetUserId: { type: Schema.Types.ObjectId, required: true },
  targetUserType: { 
    type: String, 
    enum: ['User', 'SubUser'], 
    required: true 
  },
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: Schema.Types.ObjectId, required: true },
  requestData: { type: Schema.Types.Mixed, required: true },
  currentData: { type: Schema.Types.Mixed },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'cancelled'], 
    default: 'pending' 
  },
  approvalLevel: { 
    type: String, 
    enum: ['manager', 'admin', 'super_admin'], 
    required: true 
  },
  approvers: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    level: { type: String },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'] 
    },
    comments: { type: String },
    actionDate: { type: Date }
  }],
  finalApprover: { type: Schema.Types.ObjectId, ref: 'User' },
  finalApprovalDate: { type: Date },
  rejectionReason: { type: String },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  expiryDate: { type: Date },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Audit Log Schema for Role Management
const roleManagementAuditSchema = new Schema({
  action: { type: String, required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetUser: { type: Schema.Types.ObjectId },
  targetUserType: { type: String, enum: ['User', 'SubUser'] },
  companyId: { type: Schema.Types.ObjectId, required: true },
  details: {
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    changes: { type: Schema.Types.Mixed }
  },
  ipAddress: { type: String },
  userAgent: { type: String },
  sessionId: { type: String },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium' 
  },
  category: { 
    type: String, 
    enum: ['role_management', 'user_management', 'permission_change', 'approval'], 
    required: true 
  },
  outcome: { 
    type: String, 
    enum: ['success', 'failure', 'partial'], 
    default: 'success' 
  },
  errorMessage: { type: String },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Create indexes for performance
customRoleSchema.index({ companyId: 1, isActive: 1 });
customRoleSchema.index({ name: 1, companyId: 1 }, { unique: true });
customRoleSchema.index({ createdBy: 1 });

subUserSchema.index({ parentUserId: 1, status: 1 });
subUserSchema.index({ companyId: 1, status: 1 });
subUserSchema.index({ email: 1 }, { unique: true });
subUserSchema.index({ invitationToken: 1 });
subUserSchema.index({ customRole: 1 });

roleAssignmentHistorySchema.index({ userId: 1, userType: 1 });
roleAssignmentHistorySchema.index({ companyId: 1, createdAt: -1 });
roleAssignmentHistorySchema.index({ assignedBy: 1 });

permissionTemplateSchema.index({ category: 1, isActive: 1 });
permissionTemplateSchema.index({ isSystemTemplate: 1 });

userApprovalRequestSchema.index({ status: 1, companyId: 1 });
userApprovalRequestSchema.index({ requestedBy: 1, status: 1 });
userApprovalRequestSchema.index({ targetUserId: 1, targetUserType: 1 });
userApprovalRequestSchema.index({ 'approvers.userId': 1 });

roleManagementAuditSchema.index({ performedBy: 1, createdAt: -1 });
roleManagementAuditSchema.index({ companyId: 1, createdAt: -1 });
roleManagementAuditSchema.index({ category: 1, severity: 1 });
roleManagementAuditSchema.index({ targetUser: 1, targetUserType: 1 });

// Export models
const CustomRole = mongoose.model('CustomRole', customRoleSchema);
const SubUser = mongoose.model('SubUser', subUserSchema);
const RoleAssignmentHistory = mongoose.model('RoleAssignmentHistory', roleAssignmentHistorySchema);
const PermissionTemplate = mongoose.model('PermissionTemplate', permissionTemplateSchema);
const UserApprovalRequest = mongoose.model('UserApprovalRequest', userApprovalRequestSchema);
const RoleManagementAudit = mongoose.model('RoleManagementAudit', roleManagementAuditSchema);

module.exports = {
  CustomRole,
  SubUser,
  RoleAssignmentHistory,
  PermissionTemplate,
  UserApprovalRequest,
  RoleManagementAudit
};
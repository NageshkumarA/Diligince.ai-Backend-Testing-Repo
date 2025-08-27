const mongoose = require('mongoose');
const { Schema } = mongoose;

// Industry Profile Schema
const industryProfileSchema = new Schema({
  companyName: { type: String, required: true, trim: true },
  industryType: { 
    type: String, 
    required: true,
    enum: ['Power Generation', 'Manufacturing', 'IT Services', 'Construction', 'Healthcare', 'Finance', 'Other']
  },
  companySize: { 
    type: String, 
    enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'] 
  },
  annualRevenue: { type: String },
  headquartersLocation: { type: String },
  operatingRegions: [{ type: String }],
  complianceCertifications: [{ type: String }],
  contactInfo: {
    primaryContact: { type: String },
    phone: { type: String },
    address: { type: String },
    website: { type: String }
  },
  approvalMatrix: {
    roles: [{
      roleName: { type: String },
      approvalLimit: { type: Number },
      permissions: [{ type: String }]
    }],
    workflows: [{
      workflowType: { type: String },
      steps: [{
        stepName: { type: String },
        approverRole: { type: String },
        isRequired: { type: Boolean }
      }]
    }]
  }
}, {
  timestamps: true
});

// Requirements Schema
const requirementSchema = new Schema({
  industryId: { type: Schema.Types.ObjectId, ref: 'IndustryProfile', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  budget: {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: 'USD' }
  },
  timeline: {
    startDate: { type: Date },
    endDate: { type: Date },
    milestones: [{
      name: { type: String },
      date: { type: Date },
      description: { type: String }
    }]
  },
  technicalSpecs: { type: Schema.Types.Mixed },
  complianceRequirements: [{ type: String }],
  deliverables: [{
    name: { type: String },
    description: { type: String },
    dueDate: { type: Date }
  }],
  evaluationCriteria: [{
    criterion: { type: String },
    weight: { type: Number },
    description: { type: String }
  }],
  approvalWorkflow: {
    steps: [{
      stepName: { type: String },
      approverRole: { type: String },
      status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
      },
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      approvedAt: { type: Date },
      comments: { type: String }
    }]
  },
  documents: [{
    name: { type: String },
    url: { type: String },
    type: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  status: { 
    type: String, 
    enum: ['draft', 'pending_approval', 'approved', 'published', 'closed'], 
    default: 'draft' 
  },
  publishedAt: { type: Date },
  rfqSentTo: [{ type: Schema.Types.ObjectId, ref: 'VendorProfile' }]
}, {
  timestamps: true
});

// RFQ Schema
const rfqSchema = new Schema({
  requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement', required: true },
  industryId: { type: Schema.Types.ObjectId, ref: 'IndustryProfile', required: true },
  stakeholderId: { type: Schema.Types.ObjectId, required: true },
  stakeholderType: { 
    type: String, 
    enum: ['vendor', 'professional'], 
    required: true 
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  deliveryTimeline: { type: String },
  termsAndConditions: { type: String },
  technicalSpecs: { type: Schema.Types.Mixed },
  budget: {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: 'USD' }
  },
  dueDate: { type: Date },
  status: { 
    type: String, 
    enum: ['sent', 'viewed', 'responded', 'expired'], 
    default: 'sent' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  attachments: [{
    name: { type: String },
    url: { type: String },
    type: { type: String }
  }],
  viewedAt: { type: Date },
  respondedAt: { type: Date }
}, {
  timestamps: true
});

// Quote Schema
const quoteSchema = new Schema({
  rfqId: { type: Schema.Types.ObjectId, ref: 'RFQ', required: true },
  stakeholderId: { type: Schema.Types.ObjectId, required: true },
  stakeholderType: { 
    type: String, 
    enum: ['vendor', 'professional'], 
    required: true 
  },
  pricing: {
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    breakdown: [{
      item: { type: String },
      quantity: { type: Number },
      unitPrice: { type: Number },
      totalPrice: { type: Number }
    }],
    taxes: { type: Number },
    discounts: { type: Number }
  },
  timeline: {
    estimatedStartDate: { type: Date },
    estimatedEndDate: { type: Date },
    milestones: [{
      name: { type: String },
      date: { type: Date },
      deliverable: { type: String }
    }]
  },
  technicalProposal: { type: String },
  terms: { type: String },
  validUntil: { type: Date },
  attachments: [{
    name: { type: String },
    url: { type: String },
    type: { type: String }
  }],
  status: { 
    type: String, 
    enum: ['submitted', 'under_review', 'accepted', 'rejected', 'expired'], 
    default: 'submitted' 
  },
  evaluationScore: { type: Number },
  evaluationNotes: { type: String },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, {
  timestamps: true
});

// Purchase Order Schema
const purchaseOrderSchema = new Schema({
  poNumber: { type: String, required: true, unique: true },
  industryId: { type: Schema.Types.ObjectId, ref: 'IndustryProfile', required: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
  requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement' },
  quoteId: { type: Schema.Types.ObjectId, ref: 'Quote' },
  projectTitle: { type: String, required: true },
  orderValue: { type: Number, required: true },
  taxPercentage: { type: Number, default: 0 },
  totalValue: { type: Number, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  paymentTerms: { type: String, required: true },
  specialInstructions: { type: String },
  scopeOfWork: { type: String, required: true },
  deliverables: [{
    id: { type: String },
    description: { type: String, required: true },
    dueDate: { type: Date },
    status: { 
      type: String, 
      enum: ['pending', 'in_progress', 'completed'], 
      default: 'pending' 
    }
  }],
  paymentMilestones: [{
    id: { type: String },
    description: { type: String, required: true },
    percentage: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    amount: { type: Number },
    status: { 
      type: String, 
      enum: ['pending', 'due', 'paid'], 
      default: 'pending' 
    }
  }],
  acceptanceCriteria: [{
    id: { type: String },
    criteria: { type: String, required: true },
    isCompleted: { type: Boolean, default: false }
  }],
  isoTerms: [{ type: String }],
  customTerms: { type: String },
  status: { 
    type: String, 
    enum: ['draft', 'issued', 'acknowledged', 'in_progress', 'completed', 'cancelled'], 
    default: 'draft' 
  },
  workflowStatus: {
    currentPhase: { type: String },
    phases: [{
      name: { type: String },
      status: { 
        type: String, 
        enum: ['pending', 'in_progress', 'completed'] 
      },
      startDate: { type: Date },
      endDate: { type: Date }
    }]
  },
  documents: [{
    name: { type: String },
    url: { type: String },
    type: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  approvals: [{
    approverRole: { type: String },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'] 
    },
    comments: { type: String }
  }],
  riskAssessment: {
    level: { type: String, enum: ['low', 'medium', 'high'] },
    factors: [{ type: String }],
    mitigationPlan: { type: String }
  },
  qualityMetrics: {
    kpis: [{
      name: { type: String },
      target: { type: Number },
      actual: { type: Number },
      unit: { type: String }
    }],
    qualityGates: [{
      name: { type: String },
      criteria: { type: String },
      status: { 
        type: String, 
        enum: ['pending', 'passed', 'failed'] 
      }
    }]
  }
}, {
  timestamps: true
});

// Workflow Activities Schema
const workflowActivitySchema = new Schema({
  purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  activityType: { type: String, required: true },
  description: { type: String, required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed },
  documents: [{
    name: { type: String },
    url: { type: String },
    type: { type: String }
  }],
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'], 
    default: 'completed' 
  }
}, {
  timestamps: true
});

// Compliance Records Schema
const complianceRecordSchema = new Schema({
  entityId: { type: Schema.Types.ObjectId, required: true },
  entityType: { 
    type: String, 
    enum: ['requirement', 'purchaseOrder', 'vendor', 'industry'], 
    required: true 
  },
  standard: { type: String, required: true },
  version: { type: String },
  assessmentDate: { type: Date, required: true },
  assessedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number },
  maxScore: { type: Number },
  status: { 
    type: String, 
    enum: ['compliant', 'non_compliant', 'partially_compliant'], 
    required: true 
  },
  findings: [{
    category: { type: String },
    description: { type: String },
    severity: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'critical'] 
    },
    recommendation: { type: String }
  }],
  remediation: [{
    action: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    status: { 
      type: String, 
      enum: ['pending', 'in_progress', 'completed'] 
    }
  }],
  documents: [{
    name: { type: String },
    url: { type: String },
    type: { type: String }
  }],
  nextAssessmentDate: { type: Date }
}, {
  timestamps: true
});

// Create indexes
requirementSchema.index({ industryId: 1, status: 1 });
requirementSchema.index({ category: 1, priority: 1 });
requirementSchema.index({ publishedAt: -1 });
requirementSchema.index({ createdAt: -1 });

rfqSchema.index({ stakeholderId: 1, status: 1 });
rfqSchema.index({ requirementId: 1 });
rfqSchema.index({ dueDate: 1 });
rfqSchema.index({ createdAt: -1 });

quoteSchema.index({ rfqId: 1 });
quoteSchema.index({ stakeholderId: 1, status: 1 });
quoteSchema.index({ validUntil: 1 });
quoteSchema.index({ createdAt: -1 });

purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ industryId: 1, status: 1 });
purchaseOrderSchema.index({ vendorId: 1, status: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

workflowActivitySchema.index({ purchaseOrderId: 1, timestamp: -1 });
complianceRecordSchema.index({ entityId: 1, entityType: 1 });
complianceRecordSchema.index({ assessmentDate: -1 });
complianceRecordSchema.index({ standard: 1, status: 1 });

// Export models
const IndustryProfile = mongoose.model('IndustryProfile', industryProfileSchema);
const Requirement = mongoose.model('Requirement', requirementSchema);
const RFQ = mongoose.model('RFQ', rfqSchema);
const Quote = mongoose.model('Quote', quoteSchema);
const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
const WorkflowActivity = mongoose.model('WorkflowActivity', workflowActivitySchema);
const ComplianceRecord = mongoose.model('ComplianceRecord', complianceRecordSchema);

module.exports = {
  IndustryProfile,
  Requirement,
  RFQ,
  Quote,
  PurchaseOrder,
  WorkflowActivity,
  ComplianceRecord
};
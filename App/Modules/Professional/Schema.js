const mongoose = require('mongoose');
const { Schema } = mongoose;

// Opportunity Schema
const opportunitySchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  industryId: { type: Schema.Types.ObjectId, ref: 'IndustryProfile', required: true },
  requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement' },
  category: { type: String, required: true, trim: true },
  skillsRequired: [{ type: String, trim: true }],
  experienceLevel: { 
    type: String, 
    enum: ['entry', 'mid', 'senior', 'expert'], 
    required: true 
  },
  budget: {
    type: { type: String, enum: ['fixed', 'hourly', 'project'], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    negotiable: { type: Boolean, default: false }
  },
  timeline: {
    startDate: { type: Date },
    endDate: { type: Date },
    estimatedHours: { type: Number, min: 0 },
    isUrgent: { type: Boolean, default: false }
  },
  location: {
    type: { type: String, enum: ['remote', 'onsite', 'hybrid'], default: 'remote' },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
    timezone: { type: String }
  },
  requirements: {
    certifications: [{ type: String }],
    languages: [{ type: String }],
    tools: [{ type: String }],
    additionalRequirements: { type: String }
  },
  status: { 
    type: String, 
    enum: ['draft', 'published', 'in_progress', 'completed', 'cancelled'], 
    default: 'draft' 
  },
  visibility: { 
    type: String, 
    enum: ['public', 'invited_only', 'private'], 
    default: 'public' 
  },
  applicationDeadline: { type: Date },
  maxApplications: { type: Number, default: 50 },
  currentApplications: { type: Number, default: 0 },
  selectedProfessional: { type: Schema.Types.ObjectId, ref: 'ProfessionalProfile' },
  tags: [{ type: String, trim: true }],
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true }
  }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Application Schema
const applicationSchema = new Schema({
  opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  professionalId: { type: Schema.Types.ObjectId, ref: 'ProfessionalProfile', required: true },
  coverLetter: { type: String, required: true },
  proposedRate: {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'USD' },
    type: { type: String, enum: ['fixed', 'hourly'], required: true }
  },
  estimatedTimeline: {
    startDate: { type: Date },
    endDate: { type: Date },
    estimatedHours: { type: Number, min: 0 }
  },
  portfolio: [{
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String },
    technologies: [{ type: String }],
    completionDate: { type: Date }
  }],
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true }
  }],
  status: { 
    type: String, 
    enum: ['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'accepted', 'rejected', 'withdrawn'], 
    default: 'submitted' 
  },
  feedback: { type: String },
  interviewDetails: {
    scheduledDate: { type: Date },
    interviewType: { type: String, enum: ['phone', 'video', 'in_person'] },
    interviewerNotes: { type: String },
    score: { type: Number, min: 0, max: 100 }
  },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Availability Slot Schema
const availabilitySlotSchema = new Schema({
  professionalId: { type: Schema.Types.ObjectId, ref: 'ProfessionalProfile', required: true },
  date: { type: Date, required: true },
  timeSlots: [{
    startTime: { type: String, required: true }, // HH:MM format
    endTime: { type: String, required: true },   // HH:MM format
    isAvailable: { type: Boolean, default: true },
    isBooked: { type: Boolean, default: false },
    bookedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    bookingType: { type: String, enum: ['consultation', 'interview', 'meeting', 'work'] },
    notes: { type: String }
  }],
  timezone: { type: String, default: 'UTC' },
  recurringPattern: {
    isRecurring: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    endDate: { type: Date }
  }
}, {
  timestamps: true
});

// Calendar Event Schema
const calendarEventSchema = new Schema({
  professionalId: { type: Schema.Types.ObjectId, ref: 'ProfessionalProfile', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  eventType: { 
    type: String, 
    enum: ['meeting', 'consultation', 'interview', 'work', 'personal', 'break'], 
    required: true 
  },
  startDateTime: { type: Date, required: true },
  endDateTime: { type: Date, required: true },
  timezone: { type: String, default: 'UTC' },
  location: {
    type: { type: String, enum: ['online', 'onsite', 'phone'] },
    details: { type: String }, // Meeting link, address, phone number
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  attendees: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    email: { type: String },
    name: { type: String },
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'declined', 'tentative'], 
      default: 'pending' 
    }
  }],
  relatedTo: {
    entityType: { type: String, enum: ['opportunity', 'project', 'requirement'] },
    entityId: { type: Schema.Types.ObjectId }
  },
  reminders: [{
    type: { type: String, enum: ['email', 'sms', 'push'] },
    minutesBefore: { type: Number, required: true },
    sent: { type: Boolean, default: false }
  }],
  isRecurring: { type: Boolean, default: false },
  recurringPattern: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    interval: { type: Number, default: 1 },
    endDate: { type: Date },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }] // 0 = Sunday
  },
  status: { 
    type: String, 
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'], 
    default: 'scheduled' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  }
}, {
  timestamps: true
});

// Certification Schema
const certificationSchema = new Schema({
  professionalId: { type: Schema.Types.ObjectId, ref: 'ProfessionalProfile', required: true },
  name: { type: String, required: true, trim: true },
  issuer: { type: String, required: true, trim: true },
  issueDate: { type: Date, required: true },
  expiryDate: { type: Date },
  credentialId: { type: String, trim: true },
  credentialUrl: { type: String },
  certificateFile: {
    name: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  },
  skills: [{ type: String, trim: true }],
  category: { 
    type: String, 
    enum: ['technical', 'management', 'industry', 'language', 'safety', 'quality'], 
    required: true 
  },
  level: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced', 'expert'], 
    default: 'intermediate' 
  },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected', 'expired'], 
    default: 'pending' 
  },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  isActive: { type: Boolean, default: true },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Earnings Record Schema
const earningsRecordSchema = new Schema({
  professionalId: { type: Schema.Types.ObjectId, ref: 'ProfessionalProfile', required: true },
  opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity' },
  projectId: { type: Schema.Types.ObjectId },
  clientId: { type: Schema.Types.ObjectId, ref: 'IndustryProfile', required: true },
  earningType: { 
    type: String, 
    enum: ['project', 'consultation', 'hourly', 'milestone', 'bonus'], 
    required: true 
  },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'USD' },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'paid', 'failed', 'disputed'], 
    default: 'pending' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['bank_transfer', 'paypal', 'stripe', 'check', 'crypto'] 
  },
  workPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    hoursWorked: { type: Number, min: 0 },
    description: { type: String }
  },
  invoice: {
    invoiceNumber: { type: String },
    invoiceDate: { type: Date },
    dueDate: { type: Date },
    invoiceUrl: { type: String },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number }
  },
  milestones: [{
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    completedDate: { type: Date },
    approvedDate: { type: Date },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'approved', 'paid'], 
      default: 'pending' 
    }
  }],
  platformFee: {
    percentage: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  },
  netEarnings: { type: Number },
  paymentDate: { type: Date },
  transactionId: { type: String },
  notes: { type: String },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Professional Dashboard Metrics Schema
const professionalMetricsSchema = new Schema({
  professionalId: { type: Schema.Types.ObjectId, ref: 'ProfessionalProfile', required: true, unique: true },
  metrics: {
    totalEarnings: { type: Number, default: 0 },
    monthlyEarnings: { type: Number, default: 0 },
    totalProjects: { type: Number, default: 0 },
    activeProjects: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 }, // percentage
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    responseTime: { type: Number, default: 0 }, // in hours
    availabilityRate: { type: Number, default: 0 } // percentage
  },
  monthlyBreakdown: [{
    month: { type: String, required: true }, // YYYY-MM format
    earnings: { type: Number, default: 0 },
    projects: { type: Number, default: 0 },
    hoursWorked: { type: Number, default: 0 },
    clientsServed: { type: Number, default: 0 }
  }],
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const professionalProfileSchema = new Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  title: { type: String, trim: true },
  specialization: { type: String, required: true, trim: true },
  bio: { type: String, maxlength: 1000 },
  profileImage: { type: String },
  languages: [{ 
    language: { type: String, required: true },
    proficiency: { type: String, enum: ['basic', 'intermediate', 'advanced', 'native'], required: true }
  }],
  experience: {
    totalYears: { type: Number, required: true, min: 0 },
    positions: [{
      company: { type: String, trim: true },
      role: { type: String, trim: true },
      duration: { type: String, trim: true },
      description: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date },
      isCurrent: { type: Boolean, default: false },
      achievements: [{ type: String }]
    }]
  },
  skills: [{ type: String, trim: true }],
  expertise: [{
    domain: { type: String, required: true, trim: true },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], required: true },
    yearsOfExperience: { type: Number, min: 0 }
  }],
  certifications: [{
    name: { type: String, required: true, trim: true },
    issuer: { type: String, trim: true },
    dateObtained: { type: Date },
    expiryDate: { type: Date },
    certificateUrl: { type: String },
    credentialId: { type: String },
    isVerified: { type: Boolean, default: false }
  }],
  education: [{
    institution: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    fieldOfStudy: { type: String, trim: true },
    startYear: { type: Number },
    endYear: { type: Number },
    grade: { type: String },
    description: { type: String }
  }],
  availability: {
    isAvailable: { type: Boolean, default: true },
    preferredProjects: [{ type: String }],
    hourlyRate: { type: Number, min: 0 },
    minimumRate: { type: Number, min: 0 },
    maximumRate: { type: Number, min: 0 },
    workingHours: {
      monday: { start: String, end: String, available: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
      thursday: { start: String, end: String, available: { type: Boolean, default: true } },
      friday: { start: String, end: String, available: { type: Boolean, default: true } },
      saturday: { start: String, end: String, available: { type: Boolean, default: false } },
      sunday: { start: String, end: String, available: { type: Boolean, default: false } }
    },
    timezone: { type: String, default: 'UTC' },
    noticePeriod: { type: Number, default: 24 }, // hours
    calendar: [{
      date: { type: Date },
      isAvailable: { type: Boolean },
      timeSlots: [{ type: String }],
      notes: { type: String }
    }]
  },
  location: { type: String, trim: true },
  workPreferences: {
    workType: [{ type: String, enum: ['remote', 'onsite', 'hybrid'] }],
    projectDuration: [{ type: String, enum: ['short_term', 'long_term', 'contract', 'permanent'] }],
    industryPreferences: [{ type: String }],
    teamSize: { type: String, enum: ['solo', 'small_team', 'large_team', 'any'] },
    communicationStyle: { type: String, enum: ['formal', 'casual', 'mixed'] }
  },
  contactInfo: {
    phone: { type: String, trim: true },
    linkedIn: { type: String, trim: true },
    portfolio: { type: String, trim: true },
    github: { type: String, trim: true },
    website: { type: String, trim: true }
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
    breakdown: {
      communication: { type: Number, default: 0 },
      quality: { type: Number, default: 0 },
      timeliness: { type: Number, default: 0 },
      professionalism: { type: Number, default: 0 }
    }
  },
  reviews: [{
    clientId: { type: Schema.Types.ObjectId, ref: 'IndustryProfile', required: true },
    projectId: { type: Schema.Types.ObjectId },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },
    breakdown: {
      communication: { type: Number, min: 1, max: 5 },
      quality: { type: Number, min: 1, max: 5 },
      timeliness: { type: Number, min: 1, max: 5 },
      professionalism: { type: Number, min: 1, max: 5 }
    },
    isPublic: { type: Boolean, default: true },
    reviewDate: { type: Date, default: Date.now }
  }],
  completedProjects: { type: Number, default: 0 },
  activeProjects: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  verificationDocuments: [{
    type: { type: String, enum: ['identity', 'address', 'education', 'certification', 'portfolio'] },
    name: { type: String, required: true },
    url: { type: String, required: true },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    uploadedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  kycStatus: {
    status: { type: String, enum: ['pending', 'in_progress', 'completed', 'rejected'], default: 'pending' },
    documents: [{
      type: { type: String, required: true },
      status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
      rejectionReason: { type: String }
    }],
    completedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  paymentInfo: {
    preferredMethod: { type: String, enum: ['bank_transfer', 'paypal', 'stripe', 'crypto'] },
    bankDetails: {
      accountNumber: { type: String },
      routingNumber: { type: String },
      bankName: { type: String },
      accountHolderName: { type: String }
    },
    paypalEmail: { type: String },
    cryptoWallet: { type: String },
    taxInfo: {
      taxId: { type: String },
      taxForm: { type: String }, // W9, W8, etc.
      isUSTaxpayer: { type: Boolean }
    }
  },
  subscriptionPlan: {
    plan: { type: String, enum: ['free', 'basic', 'premium', 'enterprise'], default: 'free' },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Create indexes
professionalProfileSchema.index({ specialization: 1, 'availability.isAvailable': 1 });
professionalProfileSchema.index({ location: 1 });
professionalProfileSchema.index({ 'rating.average': -1 });
professionalProfileSchema.index({ skills: 1 });
professionalProfileSchema.index({ 'experience.totalYears': -1 });
professionalProfileSchema.index({ isVerified: 1 });
professionalProfileSchema.index({ createdAt: -1 });
professionalProfileSchema.index({ 'expertise.domain': 1 });
professionalProfileSchema.index({ 'workPreferences.workType': 1 });
professionalProfileSchema.index({ 'kycStatus.status': 1 });

opportunitySchema.index({ industryId: 1, status: 1 });
opportunitySchema.index({ category: 1, experienceLevel: 1 });
opportunitySchema.index({ skillsRequired: 1 });
opportunitySchema.index({ 'budget.amount': 1 });
opportunitySchema.index({ applicationDeadline: 1 });
opportunitySchema.index({ createdAt: -1 });
opportunitySchema.index({ isActive: 1, visibility: 1 });

applicationSchema.index({ opportunityId: 1, status: 1 });
applicationSchema.index({ professionalId: 1, status: 1 });
applicationSchema.index({ submittedAt: -1 });

availabilitySlotSchema.index({ professionalId: 1, date: 1 });
availabilitySlotSchema.index({ date: 1, 'timeSlots.isAvailable': 1 });

calendarEventSchema.index({ professionalId: 1, startDateTime: 1 });
calendarEventSchema.index({ startDateTime: 1, endDateTime: 1 });
calendarEventSchema.index({ eventType: 1, status: 1 });

certificationSchema.index({ professionalId: 1, verificationStatus: 1 });
certificationSchema.index({ category: 1, level: 1 });
certificationSchema.index({ expiryDate: 1 });

earningsRecordSchema.index({ professionalId: 1, 'workPeriod.startDate': -1 });
earningsRecordSchema.index({ clientId: 1, paymentStatus: 1 });
earningsRecordSchema.index({ paymentStatus: 1, 'invoice.dueDate': 1 });

professionalMetricsSchema.index({ professionalId: 1 });

const ProfessionalProfile = mongoose.model('ProfessionalProfile', professionalProfileSchema);
const Opportunity = mongoose.model('Opportunity', opportunitySchema);
const Application = mongoose.model('Application', applicationSchema);
const AvailabilitySlot = mongoose.model('AvailabilitySlot', availabilitySlotSchema);
const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
const Certification = mongoose.model('Certification', certificationSchema);
const EarningsRecord = mongoose.model('EarningsRecord', earningsRecordSchema);
const ProfessionalMetrics = mongoose.model('ProfessionalMetrics', professionalMetricsSchema);

module.exports = { 
  ProfessionalProfile,
  Opportunity,
  Application,
  AvailabilitySlot,
  CalendarEvent,
  Certification,
  EarningsRecord,
  ProfessionalMetrics
};
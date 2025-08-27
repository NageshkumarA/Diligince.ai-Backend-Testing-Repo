const mongoose = require('mongoose');
const { Schema } = mongoose;

const vendorProfileSchema = new Schema({
  companyName: { type: String, required: true, trim: true },
  vendorCategory: { 
    type: String, 
    required: true, 
    enum: ['service', 'product', 'logistics'] 
  },
  businessRegistration: {
    registrationNumber: { type: String, required: true, trim: true },
    taxId: { type: String, trim: true },
    incorporationDate: { type: Date }
  },
  contactInfo: {
    primaryContact: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    website: { type: String, trim: true }
  },
  serviceDetails: {
    serviceCategories: [{ type: String }],
    specializations: [{ type: String }],
    teamSize: { type: Number, min: 1 },
    experienceYears: { type: Number, min: 0 }
  },
  productDetails: {
    productCategories: [{ type: String }],
    brands: [{ type: String }],
    catalogItems: [{
      name: { type: String, trim: true },
      description: { type: String, trim: true },
      price: { type: Number, min: 0 },
      specifications: { type: Schema.Types.Mixed }
    }]
  },
  logisticsDetails: {
    serviceTypes: [{ type: String }],
    coverage: [{ type: String }],
    fleet: [{
      vehicleType: { type: String },
      capacity: { type: String },
      quantity: { type: Number, min: 0 }
    }],
    licenses: [{ type: String }]
  },
  certifications: [{
    name: { type: String, required: true, trim: true },
    issuer: { type: String, trim: true },
    dateObtained: { type: Date },
    expiryDate: { type: Date },
    certificateUrl: { type: String }
  }],
  qualityStandards: [{ type: String }],
  paymentTerms: [{ type: String }],
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  completedOrders: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Create indexes
vendorProfileSchema.index({ vendorCategory: 1, isActive: 1 });
vendorProfileSchema.index({ 'serviceDetails.serviceCategories': 1 });
vendorProfileSchema.index({ 'productDetails.productCategories': 1 });
vendorProfileSchema.index({ 'rating.average': -1 });
vendorProfileSchema.index({ companyName: 'text' });

const VendorProfile = mongoose.model('VendorProfile', vendorProfileSchema);

module.exports = { 
  VendorProfile
};
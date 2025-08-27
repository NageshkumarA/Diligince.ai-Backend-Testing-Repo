const mongoose = require('mongoose');
const { Schema } = mongoose;

const professionalProfileSchema = new Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  title: { type: String, trim: true },
  specialization: { type: String, required: true, trim: true },
  experience: {
    totalYears: { type: Number, required: true, min: 0 },
    positions: [{
      company: { type: String, trim: true },
      role: { type: String, trim: true },
      duration: { type: String, trim: true },
      description: { type: String, trim: true }
    }]
  },
  skills: [{ type: String, trim: true }],
  certifications: [{
    name: { type: String, required: true, trim: true },
    issuer: { type: String, trim: true },
    dateObtained: { type: Date },
    expiryDate: { type: Date },
    certificateUrl: { type: String }
  }],
  availability: {
    isAvailable: { type: Boolean, default: true },
    preferredProjects: [{ type: String }],
    hourlyRate: { type: Number, min: 0 },
    calendar: [{
      date: { type: Date },
      isAvailable: { type: Boolean },
      timeSlots: [{ type: String }]
    }]
  },
  location: { type: String, trim: true },
  contactInfo: {
    phone: { type: String, trim: true },
    linkedIn: { type: String, trim: true },
    portfolio: { type: String, trim: true }
  },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  completedProjects: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Create indexes
professionalProfileSchema.index({ specialization: 1, 'availability.isAvailable': 1 });
professionalProfileSchema.index({ location: 1 });
professionalProfileSchema.index({ 'rating.average': -1 });
professionalProfileSchema.index({ skills: 1 });

const ProfessionalProfile = mongoose.model('ProfessionalProfile', professionalProfileSchema);

module.exports = { 
  ProfessionalProfile
};
// modules/user/schema.js
const mongoose = require('mongoose');
const { required } = require('yargs');

const industryUserSchema = new mongoose.Schema({
  accountType: {
    type: String,
    enum: ['Industry', 'Professional', 'Vendor'],
    default: 'Industry',
    required: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
    industryType: {
    type: String,
    enum: [
      'Power Generation',
      'Manufacturing',
      'IT Services',
      'Construction',
      'Other'
    ],
    required: true
  },
  termsAccepted: {
    type: Boolean,
    required: true,
    default: false
  },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  });
let IndustrySchema = mongoose.model("industry", industryUserSchema);

module.exports = { 
    IndustrySchema
}


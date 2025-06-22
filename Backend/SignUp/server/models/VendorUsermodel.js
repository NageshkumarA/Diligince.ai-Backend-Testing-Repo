import mongoose from 'mongoose';

const vendorUserSchema = new mongoose.Schema({
  businessname: String,
  email: { type: String, unique: true },
  phonenumber: String,
  vendorcategory: String,
  specialization: String,
  password: String,
  type: { type: String, default: 'vendor' },
});

export default mongoose.model('VendorUser', vendorUserSchema);

import mongoose from 'mongoose';

const industryUserSchema = new mongoose.Schema({
  companyname: String,
  email: { type: String, unique: true },
  phonenumber: String,
  industrytype: String,
  password: String,
  type: { type: String, default: 'industry' },
});

export default mongoose.model('IndustryUser', industryUserSchema);

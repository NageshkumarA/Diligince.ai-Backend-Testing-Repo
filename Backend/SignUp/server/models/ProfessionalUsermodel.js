import mongoose from 'mongoose';

const professionalUserSchema = new mongoose.Schema({
  fullname: String,
  email: { type: String, unique: true },
  phonenumber: String,
  areaofexpertise: String,
  password: String,
  type: { type: String, default: 'professional' },
});

export default mongoose.model('ProfessionalUser', professionalUserSchema);

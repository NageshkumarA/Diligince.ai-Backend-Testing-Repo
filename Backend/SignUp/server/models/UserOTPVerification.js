import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const UserOTPVerificationSchema = new Schema({
 
  email:String,
  otp: String,
  createdAt: Date,
  expiresAt: Date,
});

const UserOTPVerification = mongoose.model('UserOTPVerification', UserOTPVerificationSchema);

export default UserOTPVerification;

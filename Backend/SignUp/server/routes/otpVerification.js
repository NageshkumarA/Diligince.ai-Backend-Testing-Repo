// routes\otpVerification.js:

import express from 'express';
import bcrypt from 'bcrypt';
import UserOTPVerification from '../models/UserOTPVerification.js';
import sendOTP from '../utils/sendOTP.js';

import IndustryUser from '../models/IndustryUsermodel.js';
import ProfessionalUser from '../models/ProfessionalUsermodel.js';
import VendorUser from '../models/VendorUsermodel.js';

const router = express.Router();

// Modified Send OTP during signup
router.post('/send', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    // Check if email already exists in any user collection
    const industryUser = await IndustryUser.findOne({ email });
    const professionalUser = await ProfessionalUser.findOne({ email });
    const vendorUser = await VendorUser.findOne({ email });

    if (industryUser || professionalUser || vendorUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    //If not found, send OTP
    await sendOTP(email, res);
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
});

//Verify OTP route
router.post('/verify', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

  try {
    const userOTPRecord = await UserOTPVerification.findOne({ email }).sort({ createdAt: -1 });


    if (!userOTPRecord) {
      return res.status(400).json({ message: 'No OTP record found or OTP expired' });
    }

    const { expiresAt, otp: hashedOTP } = userOTPRecord;

    if (expiresAt < Date.now()) {
      await UserOTPVerification.deleteOne({ email: email });
      return res.status(400).json({ message: 'OTP expired. Request a new one.' });
    }

    const validOTP = await bcrypt.compare(otp, hashedOTP);
    if (!validOTP) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    await UserOTPVerification.deleteMany({ email: email });

    return res.status(200).json({ message: 'OTP verified successfully' });
  } catch (err) {
    res.status(500).json({ message: 'OTP verification failed', error: err.message });
  }
});

export default router;
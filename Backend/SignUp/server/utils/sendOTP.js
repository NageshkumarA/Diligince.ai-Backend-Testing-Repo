import bcrypt from 'bcryptjs';
import UserOTPVerification from '../models/UserOTPVerification.js';
import transporter from '../config/emailTransporter.js';

const sendOTPVerificationEmail = async (email, res) => {
  try {
    const normalizedEmail = email.toLowerCase();
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

    const mailOptions = {
      from: 'Thinkvatesolutions1@gmail.com',
      to: normalizedEmail,
      subject: 'Verify Your Email',
      html: `<p>Your OTP is <b>${otp}</b>. It will expire in <b>10 minutes</b>.</p>`,
    };

    const hashedOTP = await bcrypt.hash(otp, 10);

    await UserOTPVerification.deleteMany({ email: normalizedEmail });

    const newOTPVerification = new UserOTPVerification({
      email: normalizedEmail,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 600000, // 10 minutes
    });

    await newOTPVerification.save();
    await transporter.sendMail(mailOptions);

    res.status(200).json({
      status: 'PENDING',
      message: 'Verification OTP email sent',
      data: { email: normalizedEmail },
    });
  } catch (error) {
    res.status(500).json({ status: 'FAILED', message: error.message });
  }
};

export default sendOTPVerificationEmail;

const { UserSchema, Authtokens } = require('../Modules/Users/Schema');
const { 
  Role, 
  Permission, 
  UserProfile, 
  Company, 
  MFA, 
  PasswordHistory, 
  SocialLogin, 
  UserApproval, 
  RoleRequest 
} = require('../Modules/Auth/Schema');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../Configs/Config');
const Email = require('./Email');
const mongoose = require('mongoose');

class UserService {
  constructor() {
    this.emailService = new Email();
  }

  // User Creation and Management
  async createUser(userData) {
    try {
      const { 
        email, 
        password, 
        phone, 
        role, 
        firstName, 
        lastName, 
        companyName, 
        companyId 
      } = userData;

      // Check if user already exists
      const existingUser = await UserSchema.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Validate role
      const validRole = await Role.findOne({ name: role, isActive: true });
      if (!validRole) {
        throw new Error('Invalid role specified');
      }

      // Hash password
      const passwordHash = await bcryptjs.hash(password, 12);

      // Handle company logic
      let profileId = null;
      if (role === 'IndustryAdmin' && companyName) {
        // Create new company
        const company = new Company({
          name: companyName,
          displayName: companyName
        });
        await company.save();
        profileId = company._id;
      } else if (companyId) {
        // Join existing company
        const company = await Company.findById(companyId);
        if (!company) {
          throw new Error('Company not found');
        }
        profileId = company._id;
      }

      // Create user
      const user = new UserSchema({
        email: email.toLowerCase(),
        password: passwordHash,
        phone,
        role,
        profileId,
        isEmailVerified: false,
        isPhoneVerified: false
      });
      await user.save();

      // Create user profile
      const userProfile = new UserProfile({
        userId: user._id,
        firstName,
        lastName
      });
      await userProfile.save();

      // Update company admin if needed
      if (role === 'IndustryAdmin' && profileId) {
        await Company.findByIdAndUpdate(profileId, {
          adminUserId: user._id,
          $push: {
            members: {
              userId: user._id,
              role: 'IndustryAdmin'
            }
          }
        });
      } else if (profileId && role === 'IndustryMember') {
        await Company.findByIdAndUpdate(profileId, {
          $push: {
            members: {
              userId: user._id,
              role: 'IndustryMember'
            }
          }
        });
      }

      // Create approval workflow
      const approvalWorkflow = new UserApproval({
        userId: user._id,
        steps: [
          { stepName: 'Email Verification', status: 'pending' },
          { stepName: 'Phone Verification', status: 'pending' },
          { stepName: 'Profile Completion', status: 'pending' },
          { stepName: 'Document Upload', status: 'pending' },
          { stepName: 'Admin Review', status: 'pending' }
        ]
      });
      await approvalWorkflow.save();

      return { user, userProfile };
    } catch (error) {
      throw error;
    }
  }

  // Authentication Methods
  async authenticateUser(email, password) {
    try {
      const user = await UserSchema.findOne({ 
        email: email.toLowerCase(),
        isActive: true
      }).populate('profileId');

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > Date.now()) {
        throw new Error('Account is temporarily locked. Please try again later.');
      }

      // Verify password
      const isPasswordValid = await bcryptjs.compare(password, user.password);
      if (!isPasswordValid) {
        // Increment login attempts
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        
        // Lock account after 5 failed attempts
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }
        
        await user.save();
        throw new Error('Invalid credentials');
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        user.loginAttempts = 0;
        user.lockUntil = undefined;
      }
      
      user.lastLoginAt = new Date();
      await user.save();

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Token Management
  async generateTokens(user, rememberMe = false) {
    try {
      const tokenExpiry = rememberMe ? '30d' : '15m';
      const refreshTokenExpiry = rememberMe ? '90d' : '7d';

      const accessToken = jwt.sign(
        { 
          id: user._id, 
          role: user.role,
          email: user.email 
        },
        config.securityToken,
        { expiresIn: tokenExpiry }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        config.refreshTokenSecret || config.securityToken,
        { expiresIn: refreshTokenExpiry }
      );

      // Store tokens in database
      const tokenExpiryTime = new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000));
      
      await Authtokens.findOneAndUpdate(
        { userId: user._id },
        {
          $push: {
            access_tokens: {
              token: accessToken,
              tokenExpiryTime,
              deviceId: 'web'
            }
          },
          refreshToken
        },
        { upsert: true }
      );

      return { accessToken, refreshToken };
    } catch (error) {
      throw error;
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.refreshTokenSecret || config.securityToken);
      const user = await UserSchema.findById(decoded.id);

      if (!user || !user.isActive) {
        throw new Error('Invalid refresh token');
      }

      // Verify refresh token exists in database
      const authToken = await Authtokens.findOne({ 
        userId: user._id, 
        refreshToken 
      });

      if (!authToken) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      return await this.generateTokens(user);
    } catch (error) {
      throw error;
    }
  }

  async revokeTokens(userId) {
    try {
      await Authtokens.deleteMany({ userId });
    } catch (error) {
      throw error;
    }
  }

  // Password Management
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await UserSchema.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcryptjs.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Check password history
      const isPasswordReused = await this.checkPasswordHistory(userId, newPassword);
      if (isPasswordReused) {
        throw new Error('Cannot reuse recent passwords');
      }

      // Save current password to history
      await this.savePasswordHistory(userId, user.password);

      // Hash and update new password
      const passwordHash = await bcryptjs.hash(newPassword, 12);
      user.password = passwordHash;
      await user.save();

      return true;
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const user = await UserSchema.findOne({
        passwordResetToken: token,
        passwordResetExpiry: { $gt: new Date() }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Check password history
      const isPasswordReused = await this.checkPasswordHistory(user._id, newPassword);
      if (isPasswordReused) {
        throw new Error('Cannot reuse recent passwords');
      }

      // Save current password to history
      await this.savePasswordHistory(user._id, user.password);

      // Hash new password
      const passwordHash = await bcryptjs.hash(newPassword, 12);

      // Update password and clear reset token
      user.password = passwordHash;
      user.passwordResetToken = undefined;
      user.passwordResetExpiry = undefined;
      await user.save();

      return true;
    } catch (error) {
      throw error;
    }
  }

  async generatePasswordResetToken(email) {
    try {
      const user = await UserSchema.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if email exists or not
        return true;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token
      user.passwordResetToken = resetToken;
      user.passwordResetExpiry = resetTokenExpiry;
      await user.save();

      // Send reset email
      await this.sendPasswordResetEmail(user, resetToken);

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Email Verification
  async generateEmailVerificationToken(userId) {
    try {
      const user = await UserSchema.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const verificationToken = jwt.sign(
        { userId: user._id },
        config.emailVerificationSecret || config.securityToken,
        { expiresIn: '24h' }
      );

      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      await this.sendVerificationEmail(user, verificationToken);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async verifyEmail(token) {
    try {
      const decoded = jwt.verify(token, config.emailVerificationSecret || config.securityToken);
      const user = await UserSchema.findById(decoded.userId);

      if (!user) {
        throw new Error('Invalid verification token');
      }

      if (user.isEmailVerified) {
        return { success: true, message: 'Email already verified' };
      }

      // Update user
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpiry = undefined;
      await user.save();

      // Update approval workflow
      await UserApproval.findOneAndUpdate(
        { userId: user._id, 'steps.stepName': 'Email Verification' },
        { 
          $set: { 
            'steps.$.status': 'completed',
            'steps.$.completedAt': new Date()
          }
        }
      );

      return { success: true, message: 'Email verified successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Phone Verification
  async generatePhoneVerificationCode(userId, phone) {
    try {
      const user = await UserSchema.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      user.phoneVerificationCode = verificationCode;
      user.phoneVerificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      if (phone) user.phone = phone;
      await user.save();

      // Send SMS (implement SMS service)
      // await this.sendSMSVerificationCode(phone, verificationCode);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async verifyPhone(userId, code) {
    try {
      const user = await UserSchema.findOne({
        _id: userId,
        phoneVerificationCode: code,
        phoneVerificationExpiry: { $gt: new Date() }
      });

      if (!user) {
        throw new Error('Invalid or expired verification code');
      }

      user.isPhoneVerified = true;
      user.phoneVerificationCode = undefined;
      user.phoneVerificationExpiry = undefined;
      await user.save();

      // Update approval workflow
      await UserApproval.findOneAndUpdate(
        { userId: user._id, 'steps.stepName': 'Phone Verification' },
        { 
          $set: { 
            'steps.$.status': 'completed',
            'steps.$.completedAt': new Date()
          }
        }
      );

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Profile Management
  async updateProfile(userId, profileData) {
    try {
      const userProfile = await UserProfile.findOneAndUpdate(
        { userId },
        { ...profileData },
        { new: true, upsert: true }
      );

      // Calculate profile completion
      const completionPercentage = this.calculateProfileCompletion(userProfile);
      userProfile.profileCompletionPercentage = completionPercentage;
      userProfile.isProfileComplete = completionPercentage >= 80;
      await userProfile.save();

      // Update approval workflow if profile is complete
      if (userProfile.isProfileComplete) {
        await UserApproval.findOneAndUpdate(
          { userId, 'steps.stepName': 'Profile Completion' },
          { 
            $set: { 
              'steps.$.status': 'completed',
              'steps.$.completedAt': new Date()
            }
          }
        );
      }

      return userProfile;
    } catch (error) {
      throw error;
    }
  }

  // Role Management
  async updateUserRole(userId, newRole, updatedBy) {
    try {
      // Validate role
      const role = await Role.findOne({ name: newRole, isActive: true });
      if (!role) {
        throw new Error('Invalid role');
      }

      // Update user role
      const user = await UserSchema.findByIdAndUpdate(
        userId, 
        { role: newRole },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Helper Methods
  async checkPasswordHistory(userId, newPassword) {
    try {
      const passwordHistory = await PasswordHistory.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5); // Check last 5 passwords

      for (const history of passwordHistory) {
        const isMatch = await bcryptjs.compare(newPassword, history.passwordHash);
        if (isMatch) {
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async savePasswordHistory(userId, passwordHash) {
    try {
      const passwordHistory = new PasswordHistory({
        userId,
        passwordHash
      });
      await passwordHistory.save();

      // Keep only last 10 passwords
      const count = await PasswordHistory.countDocuments({ userId });
      if (count > 10) {
        const oldestPasswords = await PasswordHistory.find({ userId })
          .sort({ createdAt: 1 })
          .limit(count - 10);
        
        const idsToDelete = oldestPasswords.map(p => p._id);
        await PasswordHistory.deleteMany({ _id: { $in: idsToDelete } });
      }
    } catch (error) {
      console.error('Error saving password history:', error);
    }
  }

  calculateProfileCompletion(profile) {
    const fields = [
      'firstName', 'lastName', 'bio', 'dateOfBirth', 
      'address.city', 'address.country'
    ];
    
    let completedFields = 0;
    fields.forEach(field => {
      const value = field.includes('.') 
        ? field.split('.').reduce((obj, key) => obj?.[key], profile)
        : profile[field];
      
      if (value && value.toString().trim()) {
        completedFields++;
      }
    });

    return Math.round((completedFields / fields.length) * 100);
  }

  // Email Methods
  async sendVerificationEmail(user, verificationToken) {
    try {
      const verificationUrl = `${config.frontendUrl || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      const mailOptions = {
        to: user.email,
        subject: 'Verify Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Email Verification</h2>
            <p>Please click the link below to verify your email address:</p>
            <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        `
      };

      await this.emailService.send(mailOptions);
    } catch (error) {
      console.error('Error sending verification email:', error);
    }
  }

  async sendPasswordResetEmail(user, resetToken) {
    try {
      const resetUrl = `${config.frontendUrl || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      const mailOptions = {
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Password Reset</h2>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        `
      };

      await this.emailService.send(mailOptions);
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  }

  // User Management
  async getUserById(userId) {
    try {
      const user = await UserSchema.findById(userId)
        .select('-password')
        .populate('profileId');
      
      const userProfile = await UserProfile.findOne({ userId });
      
      return {
        ...user.toObject(),
        profile: userProfile
      };
    } catch (error) {
      throw error;
    }
  }

  async deactivateUser(userId, reason, dataRetention = 'retain_30_days') {
    try {
      const user = await UserSchema.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.isActive = false;
      user.deactivatedAt = new Date();
      user.deactivationReason = reason;
      await user.save();

      // Revoke all tokens
      await this.revokeTokens(userId);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async reactivateUser(userId) {
    try {
      const user = await UserSchema.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.isActive = true;
      user.deactivatedAt = undefined;
      user.deactivationReason = undefined;
      await user.save();

      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserService;
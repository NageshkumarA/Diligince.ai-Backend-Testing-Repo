const Controller = require("../Base/Controller");
const Middleware = require("../../Services/Middleware");
const { UserSchema, Authtokens } = require("../Users/Schema");
const {
  Role,
  Permission,
  UserProfile,
  Company,
  MFA,
  PasswordHistory,
  SocialLogin,
  UserApproval,
  RoleRequest,
} = require("./Schema");
const NotificationService = require("../../Services/NotificationService");
const Email = require("../../Services/Email");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const _ = require("lodash");
const config = require("../../../Configs/Config");

class AuthController extends Controller {
  constructor() {
    super();
    this.notificationService = new NotificationService();
    this.emailService = new Email();
  }

  // User Registration
  // User Registration
  async register() {
    try {
      const {
        email,
        password,
        phone,
        role,
        firstName,
        lastName,
        companyName,
        companyId,
      } = this.req.body;

      // 1️⃣ Check if user already exists
      const existingUser = await UserSchema.findOne({
        email: email.toLowerCase(),
      });
      if (existingUser) {
        return this.res.status(400).send({
          status: false,
          message: "User already exists with this email",
        });
      }

      // 2️⃣ Validate role
      const validRole = await Role.findOne({ name: role, isActive: true });
      if (!validRole) {
        return this.res.status(400).send({
          status: false,
          message: "Invalid role specified",
        });
      }

      // 3️⃣ Hash password
      const passwordHash = await bcryptjs.hash(password, 12);

      // 4️⃣ Handle company logic
      let profileId = null;

      if (role === "IndustryAdmin" && companyName) {
        // Check if company already exists (prevents duplicate key error)
        const existingCompany = await Company.findOne({ name: companyName });
        if (existingCompany) {
          return this.res.status(400).send({
            status: false,
            message: "Company already exists with this name",
          });
        }

        // Create new company
        const company = new Company({
          name: companyName,
          displayName: companyName,
        });
        await company.save();
        profileId = company._id;
      } else if (companyId) {
        // Join existing company
        const company = await Company.findById(companyId);
        if (!company) {
          return this.res.status(400).send({
            status: false,
            message: "Company not found",
          });
        }
        profileId = company._id;
      }

      // 5️⃣ Create user
      const user = new UserSchema({
        email: email.toLowerCase(),
        password: passwordHash,
        phone,
        role,
        profileId,
        isEmailVerified: false,
        isPhoneVerified: false,
      });
      await user.save();

      // 6️⃣ Create user profile
      const userProfile = new UserProfile({
        userId: user._id,
        firstName,
        lastName,
      });
      await userProfile.save();

      // 7️⃣ Update company members/admin
      if (profileId) {
        const updateData =
          role === "IndustryAdmin" ? { adminUserId: user._id } : {};

        await Company.findByIdAndUpdate(profileId, {
          ...updateData,
          $push: { members: { userId: user._id, role } },
        });
      }

      // 8️⃣ Create approval workflow
      const approvalWorkflow = new UserApproval({
        userId: user._id,
        steps: [
          { stepName: "Email Verification", status: "pending" },
          { stepName: "Phone Verification", status: "pending" },
          { stepName: "Profile Completion", status: "pending" },
          { stepName: "Document Upload", status: "pending" },
          { stepName: "Admin Review", status: "pending" },
        ],
      });
      await approvalWorkflow.save();

      // 9️⃣ Send verification email
      await this.sendVerificationEmail(user);

      // 🔟 Respond success
      this.res.status(201).send({
        status: true,
        statusCode: 201,
        message: "User registered successfully. Please verify your email.",
        data: {
          userId: user._id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      console.error("Error in user registration:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // User Login
  async login() {
    try {
      const { email, password, rememberMe } = this.req.body;

      // Find user
      const user = await UserSchema.findOne({
        email: email.toLowerCase(),
      }).populate("profileId");

      if (!user) {
        return this.res.status(401).send({
          status: false,
          message: "Invalid credentials",
        });
      }

      // Verify password
      const isPasswordValid = await bcryptjs.compare(password, user.password);
      if (!isPasswordValid) {
        return this.res.status(401).send({
          status: false,
          message: "Invalid credentials",
        });
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return this.res.status(403).send({
          status: false,
          message: "Please verify your email before logging in",
        });
      }

      // Check MFA
      const mfa = await MFA.findOne({ userId: user._id });
      if (mfa && mfa.isEnabled) {
        // Generate and send MFA code
        const mfaCode = this.generateMFACode();
        // Store MFA code temporarily (you might want to use Redis for this)
        // For now, we'll send it via email/SMS
        await this.sendMFACode(user, mfaCode);

        return this.res.send({
          status: true,
          message: "MFA code sent. Please verify to complete login.",
          data: {
            requiresMFA: true,
            userId: user._id,
          },
        });
      }

      // Generate tokens
      const tokenData = await this.generateTokens(user, rememberMe);

      // Get user profile
      const userProfile = await UserProfile.findOne({ userId: user._id });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Login successful",
        data: {
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
            profile: userProfile,
          },
        },
        meta: {
          access_token: tokenData.accessToken,
          refresh_token: tokenData.refreshToken,
        },
      });
    } catch (error) {
      console.error("Error in user login:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Refresh Token
  async refreshToken() {
    try {
      const { refresh_token } = this.req.body;

      if (!refresh_token) {
        return this.res.status(401).send({
          status: false,
          message: "Refresh token required",
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(refresh_token, config.refreshTokenSecret);
      const user = await UserSchema.findById(decoded.id);

      if (!user) {
        return this.res.status(401).send({
          status: false,
          message: "Invalid refresh token",
        });
      }

      // Generate new tokens
      const tokenData = await this.generateTokens(user);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Tokens refreshed successfully",
        meta: {
          access_token: tokenData.accessToken,
          refresh_token: tokenData.refreshToken,
        },
      });
    } catch (error) {
      console.error("Error refreshing token:", error);
      this.res.status(401).send({
        status: false,
        message: "Invalid refresh token",
      });
    }
  }

  // Logout
  async logout() {
    try {
      const userId = this.req.user.id;

      // Remove auth tokens
      await Authtokens.deleteMany({ userId });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Error in logout:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }

  // Forgot Password
  async forgotPassword() {
    try {
      const { email } = this.req.body;

      const user = await UserSchema.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if email exists or not
        return this.res.send({
          status: true,
          message: "If the email exists, a password reset link has been sent.",
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token (you might want to add fields to User schema)
      user.passwordResetToken = resetToken;
      user.passwordResetExpiry = resetTokenExpiry;
      await user.save();

      // Send reset email
      await this.sendPasswordResetEmail(user, resetToken);

      this.res.send({
        status: true,
        message: "Password reset link sent to your email",
      });
    } catch (error) {
      console.error("Error in forgot password:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }

  // Reset Password
  async resetPassword() {
    try {
      const { token, newPassword } = this.req.body;

      const user = await UserSchema.findOne({
        passwordResetToken: token,
        passwordResetExpiry: { $gt: new Date() },
      });

      if (!user) {
        return this.res.status(400).send({
          status: false,
          message: "Invalid or expired reset token",
        });
      }

      // Check password history
      const isPasswordReused = await this.checkPasswordHistory(
        user._id,
        newPassword
      );
      if (isPasswordReused) {
        return this.res.status(400).send({
          status: false,
          message: "Cannot reuse recent passwords",
        });
      }

      // Hash new password
      const passwordHash = await bcryptjs.hash(newPassword, 12);

      // Save password history
      await this.savePasswordHistory(user._id, user.password);

      // Update password
      user.password = passwordHash;
      user.passwordResetToken = undefined;
      user.passwordResetExpiry = undefined;
      await user.save();

      this.res.send({
        status: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Error in reset password:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }

  // Verify Email
  async verifyEmail() {
    try {
      const { token } = this.req.body;

      // Decode token to get user ID
      const decoded = jwt.verify(token, config.emailVerificationSecret);
      const user = await UserSchema.findById(decoded.userId);

      if (!user) {
        return this.res.status(400).send({
          status: false,
          message: "Invalid verification token",
        });
      }

      if (user.isEmailVerified) {
        return this.res.send({
          status: true,
          message: "Email already verified",
        });
      }

      // Update user
      user.isEmailVerified = true;
      await user.save();

      // Update approval workflow
      await UserApproval.findOneAndUpdate(
        { userId: user._id, "steps.stepName": "Email Verification" },
        {
          $set: {
            "steps.$.status": "completed",
            "steps.$.completedAt": new Date(),
          },
        }
      );

      this.res.send({
        status: true,
        message: "Email verified successfully",
      });
    } catch (error) {
      console.error("Error in email verification:", error);
      this.res.status(400).send({
        status: false,
        message: "Invalid or expired verification token",
      });
    }
  }

  // Resend Verification Email
  async resendVerification() {
    try {
      const { email } = this.req.body;

      const user = await UserSchema.findOne({ email: email.toLowerCase() });
      if (!user) {
        return this.res.status(404).send({
          status: false,
          message: "User not found",
        });
      }

      if (user.isEmailVerified) {
        return this.res.send({
          status: true,
          message: "Email already verified",
        });
      }

      await this.sendVerificationEmail(user);

      this.res.send({
        status: true,
        message: "Verification email sent",
      });
    } catch (error) {
      console.error("Error resending verification:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }

  // Change Password
  async changePassword() {
    try {
      const { currentPassword, newPassword } = this.req.body;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);
      if (!user) {
        return this.res.status(404).send({
          status: false,
          message: "User not found",
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcryptjs.compare(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        return this.res.status(400).send({
          status: false,
          message: "Current password is incorrect",
        });
      }

      // Check password history
      const isPasswordReused = await this.checkPasswordHistory(
        userId,
        newPassword
      );
      if (isPasswordReused) {
        return this.res.status(400).send({
          status: false,
          message: "Cannot reuse recent passwords",
        });
      }

      // Save current password to history
      await this.savePasswordHistory(userId, user.password);

      // Hash and update new password
      const passwordHash = await bcryptjs.hash(newPassword, 12);
      user.password = passwordHash;
      await user.save();

      this.res.send({
        status: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }

  // Get Current User
  async me() {
    try {
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId)
        .select("-password")
        .populate("profileId");

      const userProfile = await UserProfile.findOne({ userId });
      const mfa = await MFA.findOne({ userId });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "User data retrieved successfully",
        data: {
          user: {
            ...user.toObject(),
            profile: userProfile,
            mfaEnabled: mfa?.isEnabled || false,
          },
        },
      });
    } catch (error) {
      console.error("Error getting user data:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }

  // Update Profile
  async updateProfile() {
    try {
      const userId = this.req.user.id;
      const profileData = this.req.body;

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
          { userId, "steps.stepName": "Profile Completion" },
          {
            $set: {
              "steps.$.status": "completed",
              "steps.$.completedAt": new Date(),
            },
          }
        );
      }

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Profile updated successfully",
        data: userProfile,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }

  // MFA Enable
  async enableMFA() {
    try {
      const userId = this.req.user.id;
      const { method, value } = this.req.body; // method: 'sms', 'email', value: phone/email

      let mfa = await MFA.findOne({ userId });
      if (!mfa) {
        mfa = new MFA({ userId });
      }

      // Add or update method
      const existingMethodIndex = mfa.methods.findIndex(
        (m) => m.type === method
      );
      if (existingMethodIndex >= 0) {
        mfa.methods[existingMethodIndex].value = value;
        mfa.methods[existingMethodIndex].isVerified = false;
      } else {
        mfa.methods.push({
          type: method,
          value,
          isVerified: false,
          isPrimary: mfa.methods.length === 0,
        });
      }

      await mfa.save();

      // Send verification code
      const verificationCode = this.generateMFACode();
      await this.sendMFAVerificationCode(
        userId,
        method,
        value,
        verificationCode
      );

      this.res.send({
        status: true,
        message: "MFA method added. Please verify with the code sent.",
        data: { method, requiresVerification: true },
      });
    } catch (error) {
      console.error("Error enabling MFA:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }

  // MFA Verify
  async verifyMFA() {
    try {
      const { userId, code, method, isLoginVerification } = this.req.body;

      // Check if userId is provided
      if (!userId || !method || !code) {
        return this.res.status(400).send({
          status: false,
          message: "userId, method, and code are required",
        });
      }

      // Find MFA record for the user
      const mfa = await MFA.findOne({ userId });
      if (!mfa) {
        return this.res.status(404).send({
          status: false,
          message: "MFA setup not found for this user",
        });
      }

      // Verify the code (implementation depends on your logic)
      const isCodeValid = await this.verifyMFACode(userId, code, method);
      if (!isCodeValid) {
        return this.res.status(400).send({
          status: false,
          message: "Invalid verification code",
        });
      }

      // Update MFA method as verified
      const methodIndex = mfa.methods.findIndex((m) => m.type === method);
      if (methodIndex >= 0) {
        mfa.methods[methodIndex].isVerified = true;
        mfa.isEnabled = true;
        mfa.lastVerifiedAt = new Date();
        await mfa.save();
      } else {
        return this.res.status(400).send({
          status: false,
          message: `MFA method "${method}" not found for this user`,
        });
      }

      // If this MFA verification is part of login
      if (isLoginVerification) {
        const user = await UserSchema.findById(userId);
        if (!user) {
          return this.res.status(404).send({
            status: false,
            message: "User not found",
          });
        }

        const tokenData = await this.generateTokens(user);
        return this.res.send({
          status: true,
          message: "MFA verified. Login successful.",
          meta: {
            access_token: tokenData.accessToken,
            refresh_token: tokenData.refreshToken,
          },
        });
      }

      // For non-login MFA verification
      return this.res.send({
        status: true,
        message: "MFA verified successfully",
      });
    } catch (error) {
      console.error("Error verifying MFA:", error);
      return this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }

  // Get Roles
  async getRoles() {
    try {
      const roles = await Role.find({ isActive: true }).select(
        "name displayName description permissions"
      );

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Roles retrieved successfully",
        data: roles,
      });
    } catch (error) {
      console.error("Error getting roles:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }

  // Update User Role
  async updateRole() {
    try {
      const { userId, newRole } = this.req.body;
      const requesterId = this.req.user.id;

      // Validate role
      const role = await Role.findOne({ name: newRole, isActive: true });
      if (!role) {
        return this.res.status(400).send({
          status: false,
          message: "Invalid role",
        });
      }

      // Check permissions (only SuperAdmin or IndustryAdmin can change roles)
      const requester = await UserSchema.findById(requesterId);
      if (!["SuperAdmin", "IndustryAdmin"].includes(requester.role)) {
        return this.res.status(403).send({
          status: false,
          message: "Insufficient permissions",
        });
      }

      // Update user role
      await UserSchema.findByIdAndUpdate(userId, { role: newRole });

      this.res.send({
        status: true,
        message: "User role updated successfully",
      });
    } catch (error) {
      console.error("Error updating role:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }

  // Request Role Change
  async requestRole() {
    try {
      const { requestedRole, reason } = this.req.body;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);

      const roleRequest = new RoleRequest({
        userId,
        requestedRole,
        currentRole: user.role,
        reason,
        requestedBy: userId,
      });

      await roleRequest.save();

      this.res.send({
        status: true,
        message: "Role change request submitted successfully",
      });
    } catch (error) {
      console.error("Error requesting role:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
      });
    }
  }

  // Helper Methods
  async generateTokens(user, rememberMe = false) {
    const tokenExpiry = rememberMe ? "30d" : "15m";
    const refreshTokenExpiry = rememberMe ? "90d" : "7d";

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      config.securityToken,
      { expiresIn: tokenExpiry }
    );

    const refreshToken = jwt.sign({ id: user._id }, config.refreshTokenSecret, {
      expiresIn: refreshTokenExpiry,
    });

    // Store tokens in database
    await Authtokens.findOneAndUpdate(
      { userId: user._id },
      {
        $push: {
          access_tokens: {
            token: accessToken,
            tokenExpiryTime: new Date(
              Date.now() +
                (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000)
            ),
            deviceId: "web",
          },
        },
        refreshToken,
      },
      { upsert: true }
    );

    return { accessToken, refreshToken };
  }

  async sendVerificationEmail(user) {
    const verificationToken = jwt.sign(
      { userId: user._id },
      config.emailVerificationSecret,
      { expiresIn: "24h" }
    );

    const verificationUrl = `${config.frontendUrl}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      to: user.email,
      subject: "Verify Your Email Address",
      html: `
        <h2>Email Verification</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
    };

    await this.emailService.send(mailOptions);
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    await this.emailService.send(mailOptions);
  }

  generateMFACode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendMFACode(user, code) {
    const mailOptions = {
      to: user.email,
      subject: "Your Login Verification Code",
      html: `
        <h2>Login Verification</h2>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code will expire in 10 minutes.</p>
      `,
    };

    await this.emailService.send(mailOptions);
  }

  async checkPasswordHistory(userId, newPassword) {
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
  }

  async savePasswordHistory(userId, passwordHash) {
    const passwordHistory = new PasswordHistory({
      userId,
      passwordHash,
    });
    await passwordHistory.save();

    // Keep only last 10 passwords
    const count = await PasswordHistory.countDocuments({ userId });
    if (count > 10) {
      const oldestPasswords = await PasswordHistory.find({ userId })
        .sort({ createdAt: 1 })
        .limit(count - 10);

      const idsToDelete = oldestPasswords.map((p) => p._id);
      await PasswordHistory.deleteMany({ _id: { $in: idsToDelete } });
    }
  }

  calculateProfileCompletion(profile) {
    const fields = [
      "firstName",
      "lastName",
      "bio",
      "dateOfBirth",
      "address.city",
      "address.country",
    ];

    let completedFields = 0;
    fields.forEach((field) => {
      const value = field.includes(".")
        ? field.split(".").reduce((obj, key) => obj?.[key], profile)
        : profile[field];

      if (value && value.toString().trim()) {
        completedFields++;
      }
    });

    return Math.round((completedFields / fields.length) * 100);
  }

  async sendMFAVerificationCode(userId, method, value, code) {
    // Store code temporarily (implement with Redis or temporary storage)
    // For now, send via email
    if (method === "email") {
      const mailOptions = {
        to: value,
        subject: "MFA Verification Code",
        html: `
          <h2>MFA Setup Verification</h2>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>This code will expire in 10 minutes.</p>
        `,
      };
      await this.emailService.send(mailOptions);
    }
  }

  async verifyMFACode(userId, code, method) {
    // Implement code verification logic
    // This would typically check against stored codes in Redis or database
    return true; // Placeholder
  }

  async handleSocialCallback() {
    // 1. Get the authorization code from the request query params
    const { code } = this.req.query;
    const provider = this.req.params.provider; // e.g., 'google', 'linkedin'

    // 2. Exchange the code for an access token with the provider's API
    //    (This requires a separate helper function for each provider)
    try {
      const userData = await this.getSocialUserData(provider, code);

      // 3. Check if the user exists in your database
      let user = await UserSchema.findOne({ email: userData.email });

      if (!user) {
        // 4. If the user doesn't exist, create a new user and profile
        //    You'll need a way to assign a default role.
        const newUser = new UserSchema({
          email: userData.email,
          isEmailVerified: true,
          role: "DefaultUserRole",
          socialLogins: [{ provider, providerId: userData.id }],
        });
        await newUser.save();

        const newUserProfile = new UserProfile({
          userId: newUser._id,
          firstName: userData.firstName,
          lastName: userData.lastName,
        });
        await newUserProfile.save();

        user = newUser;
      } else {
        // 5. If the user exists, link the social account
        const isLinked = user.socialLogins.some(
          (sl) => sl.provider === provider
        );
        if (!isLinked) {
          user.socialLogins.push({ provider, providerId: userData.id });
          await user.save();
        }
      }

      // 6. Generate and send your application's tokens
      const { accessToken, refreshToken } = await this.generateTokens(user);

      this.res.send({
        status: true,
        message: "Social login successful",
        data: { accessToken, refreshToken },
      });
    } catch (error) {
      console.error("Social login failed:", error);
      this.res.status(500).send({
        status: false,
        message: "Social login failed. Internal server error.",
      });
    }
  }
  // Generate MFA Backup Codes
  async generateBackupCodes() {
    try {
      const userId = this.req.user.id;

      // Generate 10 backup codes
      const backupCodes = Array.from({ length: 10 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      // Store hashed codes in DB (so they can't be reused if leaked)
      let mfa = await MFA.findOne({ userId });
      if (!mfa) {
        mfa = new MFA({ userId });
      }

      mfa.backupCodes = backupCodes.map((code) => ({
        codeHash: bcryptjs.hashSync(code, 10),
        used: false,
      }));

      await mfa.save();

      // Return plain codes to user (only once!)
      this.res.send({
        status: true,
        message: "Backup codes generated successfully. Save them securely.",
        data: backupCodes,
      });
    } catch (error) {
      console.error("Error generating backup codes:", error);
      this.res.status(500).send({
        status: false,
        message: "Internal server error",
      });
    }
  }

  // Disable MFA
  async disableMFA() {
    try {
      const userId = this.req.user.id;

      const mfa = await MFA.findOne({ userId });
      if (!mfa) {
        return this.res.status(404).send({
          status: false,
          message: "MFA not enabled for this user",
        });
      }

      // Optionally, clear methods or disable MFA
      mfa.isEnabled = false;
      mfa.methods = [];
      await mfa.save();

      this.res.send({
        status: true,
        message: "MFA disabled successfully",
      });
    } catch (error) {
      console.error("Error disabling MFA:", error);
      this.res.status(500).send({
        status: false,
        message: "Internal server error",
      });
    }
  }

  // Inside AuthController class

  // Get all members of the company
  // ---------------------------
  // Company Member Methods
  // ---------------------------

  // 1️⃣ Get all members of the company (IndustryAdmin only)
  async getCompanyMembers() {
    try {
      const userId = this.req.user.id;
      const user = await UserSchema.findById(userId);

      if (!user || !user.profileId) {
        return this.res.status(400).send({
          status: false,
          message: "User not associated with any company",
        });
      }

      if (user.role !== "IndustryAdmin") {
        return this.res.status(403).send({
          status: false,
          message: "Access denied. Only IndustryAdmin can view members.",
        });
      }

      const company = await Company.findById(user.profileId).populate(
        "members.userId",
        "email role profileId"
      );
      if (!company) {
        return this.res.status(404).send({
          status: false,
          message: "Company not found",
        });
      }

      this.res.send({
        status: true,
        message: "Company members retrieved successfully",
        data: company.members,
      });
    } catch (error) {
      console.error("Error fetching company members:", error);
      this.res.status(500).send({
        status: false,
        message: "Internal server error",
      });
    }
  }

  // 2️⃣ Add a new member to the company (IndustryAdmin only)
  async addCompanyMember() {
    try {
      const userId = this.req.user.id;
      const { email, role } = this.req.body;

      const adminUser = await UserSchema.findById(userId);
      if (!adminUser || adminUser.role !== "IndustryAdmin") {
        return this.res.status(403).send({
          status: false,
          message: "Access denied. Only IndustryAdmin can add members.",
        });
      }

      const company = await Company.findById(adminUser.profileId);
      if (!company) {
        return this.res.status(404).send({
          status: false,
          message: "Company not found",
        });
      }

      const user = await UserSchema.findOne({ email: email.toLowerCase() });
      if (!user) {
        return this.res.status(404).send({
          status: false,
          message: "User not found",
        });
      }

      // Check if already a member
      const alreadyMember = company.members.some(
        (m) => m.userId.toString() === user._id.toString()
      );
      if (alreadyMember) {
        return this.res.status(400).send({
          status: false,
          message: "User is already a member of this company",
        });
      }

      // Add member
      company.members.push({ userId: user._id, role });
      await company.save();

      this.res.send({
        status: true,
        message: "Member added successfully",
        data: { userId: user._id, email: user.email, role },
      });
    } catch (error) {
      console.error("Error adding company member:", error);
      this.res.status(500).send({
        status: false,
        message: "Internal server error",
      });
    }
  }

  // 3️⃣ Remove a member from the company (IndustryAdmin only)
  async removeCompanyMember() {
    try {
      const userId = this.req.user.id;
      const { memberId } = this.req.params;

      const adminUser = await UserSchema.findById(userId);
      if (!adminUser || adminUser.role !== "IndustryAdmin") {
        return this.res.status(403).send({
          status: false,
          message: "Access denied. Only IndustryAdmin can remove members.",
        });
      }

      const company = await Company.findById(adminUser.profileId);
      if (!company) {
        return this.res.status(404).send({
          status: false,
          message: "Company not found",
        });
      }

      const memberIndex = company.members.findIndex(
        (m) => m.userId.toString() === memberId
      );

      if (memberIndex === -1) {
        return this.res.status(404).send({
          status: false,
          message: "Member not found in the company",
        });
      }

      company.members.splice(memberIndex, 1);
      await company.save();

      this.res.send({
        status: true,
        message: "Member removed successfully",
      });
    } catch (error) {
      console.error("Error removing company member:", error);
      this.res.status(500).send({
        status: false,
        message: "Internal server error",
      });
    }
  }

  // 4️⃣ Update a member's role (IndustryAdmin only)
  async updateMemberRole() {
    try {
      const userId = this.req.user.id;
      const { memberId } = this.req.params;
      const { newRole } = this.req.body;

      const adminUser = await UserSchema.findById(userId);
      if (!adminUser || adminUser.role !== "IndustryAdmin") {
        return this.res.status(403).send({
          status: false,
          message: "Access denied. Only IndustryAdmin can update member roles.",
        });
      }

      const company = await Company.findById(adminUser.profileId);
      if (!company) {
        return this.res.status(404).send({
          status: false,
          message: "Company not found",
        });
      }

      const member = company.members.find(
        (m) => m.userId.toString() === memberId
      );

      if (!member) {
        return this.res.status(404).send({
          status: false,
          message: "Member not found in the company",
        });
      }

      member.role = newRole;
      await company.save();

      this.res.send({
        status: true,
        message: "Member role updated successfully",
        data: { userId: memberId, role: newRole },
      });
    } catch (error) {
      console.error("Error updating member role:", error);
      this.res.status(500).send({
        status: false,
        message: "Internal server error",
      });
    }
  }

  // Get pending user approvals (Admin only)
  async getPendingApprovals() {
    try {
      const pendingUsers = await UserApproval.find({
        "steps.status": "pending",
      }).populate("userId", "email role profileId");

      this.res.send({
        status: true,
        message: "Pending approvals retrieved successfully",
        data: pendingUsers,
      });
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      this.res.status(500).send({
        status: false,
        message: "Internal server error",
      });
    }
  }

  // Approve a user
  async approveUser() {
    try {
      const { userId } = this.req.params;

      const approval = await UserApproval.findOne({ userId });
      if (!approval) {
        return this.res.status(404).send({
          status: false,
          message: "Approval workflow not found",
        });
      }

      // Mark admin review step as completed
      const stepIndex = approval.steps.findIndex(
        (s) => s.stepName === "Admin Review"
      );
      if (stepIndex !== -1) {
        approval.steps[stepIndex].status = "completed";
        approval.steps[stepIndex].completedAt = new Date();
      }
      await approval.save();

      this.res.send({
        status: true,
        message: "User approved successfully",
      });
    } catch (error) {
      console.error("Error approving user:", error);
      this.res.status(500).send({
        status: false,
        message: "Internal server error",
      });
    }
  }

  // Reject a user
  async rejectUser() {
    try {
      const { userId } = this.req.params;
      const { reason } = this.req.body;

      const approval = await UserApproval.findOne({ userId });
      if (!approval) {
        return this.res.status(404).send({
          status: false,
          message: "Approval workflow not found",
        });
      }

      // Mark admin review step as rejected
      const stepIndex = approval.steps.findIndex(
        (s) => s.stepName === "Admin Review"
      );
      if (stepIndex !== -1) {
        approval.steps[stepIndex].status = "rejected";
        approval.steps[stepIndex].reason = reason;
        approval.steps[stepIndex].completedAt = new Date();
      }
      await approval.save();

      this.res.send({
        status: true,
        message: "User rejected successfully",
      });
    } catch (error) {
      console.error("Error rejecting user:", error);
      this.res.status(500).send({
        status: false,
        message: "Internal server error",
      });
    }
  }

  // Get user approval status
  async getApprovalStatus() {
    try {
      const userId = this.req.user.id;

      const approval = await UserApproval.findOne({ userId });
      if (!approval) {
        return this.res.status(404).send({
          status: false,
          message: "Approval workflow not found",
        });
      }

      this.res.send({
        status: true,
        message: "Approval status retrieved successfully",
        data: approval.steps,
      });
    } catch (error) {
      console.error("Error fetching approval status:", error);
      this.res.status(500).send({
        status: false,
        message: "Internal server error",
      });
    }
  }

  // Upload documents for approval
  async uploadApprovalDocument() {
    try {
      // Assuming file is available in req.file (via multer)
      const userId = this.req.user.id;
      const file = this.req.file;

      if (!file) {
        return this.res.status(400).send({
          status: false,
          message: "No document uploaded",
        });
      }

      // Save file reference in UserApproval
      await UserApproval.findOneAndUpdate(
        { userId },
        { $push: { documents: { path: file.path, uploadedAt: new Date() } } }
      );

      this.res.send({
        status: true,
        message: "Document uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      this.res.status(500).send({
        status: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = AuthController;

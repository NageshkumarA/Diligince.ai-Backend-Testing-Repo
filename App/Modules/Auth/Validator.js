const Joi = require("joi");

class AuthValidators {
    
    // Registration Validation
    static validateRegistration() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    email: Joi.string().email().trim().required(),
                    password: Joi.string().min(8).max(128).required()
                        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
                        .message('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
                    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
                    role: Joi.string().valid('IndustryAdmin', 'IndustryMember', 'Professional', 'Vendor').required(),
                    firstName: Joi.string().trim().min(2).max(50).required(),
                    lastName: Joi.string().trim().min(2).max(50).required(),
                    companyName: Joi.string().trim().min(2).max(100).when('role', {
                        is: 'IndustryAdmin',
                        then: Joi.required(),
                        otherwise: Joi.optional()
                    }),
                    companyId: Joi.string().when('role', {
                        is: 'IndustryMember',
                        then: Joi.required(),
                        otherwise: Joi.optional()
                    }),
                    termsAccepted: Joi.boolean().valid(true).required(),
                    privacyAccepted: Joi.boolean().valid(true).required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Login Validation
    static validateLogin() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    email: Joi.string().email().trim().required(),
                    password: Joi.string().required(),
                    rememberMe: Joi.boolean().optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Refresh Token Validation
    static validateRefreshToken() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    refresh_token: Joi.string().required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Forgot Password Validation
    static validateForgotPassword() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    email: Joi.string().email().trim().required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Reset Password Validation
    static validateResetPassword() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    token: Joi.string().required(),
                    newPassword: Joi.string().min(8).max(128).required()
                        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
                        .message('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Email Verification Validation
    static validateEmailVerification() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    token: Joi.string().required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Resend Verification Validation
    static validateResendVerification() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    email: Joi.string().email().trim().required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Change Password Validation
    static validateChangePassword() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    currentPassword: Joi.string().required(),
                    newPassword: Joi.string().min(8).max(128).required()
                        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
                        .message('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
                        .invalid(Joi.ref('currentPassword'))
                        .message('New password must be different from current password')
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Profile Update Validation
    static validateProfileUpdate() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    firstName: Joi.string().trim().min(2).max(50).optional(),
                    lastName: Joi.string().trim().min(2).max(50).optional(),
                    bio: Joi.string().max(500).optional(),
                    dateOfBirth: Joi.date().max('now').optional(),
                    gender: Joi.string().valid('male', 'female', 'other').optional(),
                    address: Joi.object({
                        street: Joi.string().max(100).optional(),
                        city: Joi.string().max(50).optional(),
                        state: Joi.string().max(50).optional(),
                        country: Joi.string().max(50).optional(),
                        zipCode: Joi.string().max(20).optional()
                    }).optional(),
                    socialLinks: Joi.object({
                        linkedin: Joi.string().uri().optional(),
                        twitter: Joi.string().uri().optional(),
                        website: Joi.string().uri().optional()
                    }).optional(),
                    emergencyContact: Joi.object({
                        name: Joi.string().max(100).optional(),
                        relationship: Joi.string().max(50).optional(),
                        phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
                        email: Joi.string().email().optional()
                    }).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // MFA Enable Validation
    static validateMFAEnable() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    method: Joi.string().valid('sms', 'email', 'authenticator').required(),
                    value: Joi.string().when('method', {
                        switch: [
                            { is: 'sms', then: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required() },
                            { is: 'email', then: Joi.string().email().required() },
                            { is: 'authenticator', then: Joi.string().optional() }
                        ]
                    })
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // MFA Disable Validation
    static validateMFADisable() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    password: Joi.string().required(),
                    method: Joi.string().valid('sms', 'email', 'authenticator').optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // MFA Verification Validation
    static validateMFAVerification() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    userId: Joi.string().when('isLoginVerification', {
                        is: true,
                        then: Joi.required(),
                        otherwise: Joi.optional()
                    }),
                    code: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
                    method: Joi.string().valid('sms', 'email', 'authenticator').required(),
                    isLoginVerification: Joi.boolean().optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Role Update Validation
    static validateRoleUpdate() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    userId: Joi.string().required(),
                    newRole: Joi.string().valid('SuperAdmin', 'IndustryAdmin', 'IndustryMember', 'Professional', 'Vendor', 'Support').required(),
                    reason: Joi.string().max(500).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Role Request Validation
    static validateRoleRequest() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    requestedRole: Joi.string().valid('SuperAdmin', 'IndustryAdmin', 'IndustryMember', 'Professional', 'Vendor', 'Support').required(),
                    reason: Joi.string().min(10).max(500).required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Social Callback Validation
    static validateSocialCallback() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    provider: Joi.string().valid('google', 'linkedin', 'microsoft').required(),
                    code: Joi.string().required(),
                    state: Joi.string().optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Add Member Validation
    static validateAddMember() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    email: Joi.string().email().trim().required(),
                    role: Joi.string().valid('IndustryMember').required(),
                    firstName: Joi.string().trim().min(2).max(50).required(),
                    lastName: Joi.string().trim().min(2).max(50).required(),
                    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
                    sendInvitation: Joi.boolean().default(true)
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Member Role Update Validation
    static validateMemberRoleUpdate() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    role: Joi.string().valid('IndustryMember', 'IndustryAdmin').required(),
                    reason: Joi.string().max(500).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // User Approval Validation
    static validateUserApproval() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    action: Joi.string().valid('approve', 'request_documents', 'move_to_review').required(),
                    notes: Joi.string().max(1000).optional(),
                    requiredDocuments: Joi.array().items(Joi.string()).when('action', {
                        is: 'request_documents',
                        then: Joi.required(),
                        otherwise: Joi.optional()
                    })
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // User Rejection Validation
    static validateUserRejection() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    reason: Joi.string().min(10).max(1000).required(),
                    allowReapplication: Joi.boolean().default(true)
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Phone Verification Validation
    static validatePhoneVerification() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
                    code: Joi.string().length(6).pattern(/^[0-9]+$/).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Document Upload Validation
    static validateDocumentUpload() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    documentType: Joi.string().valid('identity', 'address_proof', 'business_license', 'tax_certificate', 'other').required(),
                    description: Joi.string().max(200).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Session Management Validation
    static validateSessionManagement() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    action: Joi.string().valid('terminate_all', 'terminate_session').required(),
                    sessionId: Joi.string().when('action', {
                        is: 'terminate_session',
                        then: Joi.required(),
                        otherwise: Joi.optional()
                    })
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // Account Deactivation Validation
    static validateAccountDeactivation() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    password: Joi.string().required(),
                    reason: Joi.string().valid('temporary', 'permanent', 'security', 'other').required(),
                    feedback: Joi.string().max(1000).optional(),
                    dataRetention: Joi.string().valid('delete_immediately', 'retain_30_days', 'retain_90_days').default('retain_30_days')
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }
}

module.exports = AuthValidators;
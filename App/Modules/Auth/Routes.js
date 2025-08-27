const AuthController = require('./Controller');

module.exports = (app, express) => {
    const router = express.Router();
    const Middleware = require("../../Services/Middleware");
    const Validators = require("./Validator");
    const config = require('../../../Configs/Config');

    // Public Routes (No Authentication Required)
    
    // User Registration
    router.post('/auth/register', 
        Validators.validateRegistration(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.register();
        }
    );

    // User Login
    router.post('/auth/login', 
        Validators.validateLogin(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.login();
        }
    );

    // Refresh Token
    router.post('/auth/refresh-token', 
        Validators.validateRefreshToken(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.refreshToken();
        }
    );

    // Forgot Password
    router.post('/auth/forgot-password', 
        Validators.validateForgotPassword(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.forgotPassword();
        }
    );

    // Reset Password
    router.post('/auth/reset-password', 
        Validators.validateResetPassword(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.resetPassword();
        }
    );

    // Verify Email
    router.post('/auth/verify-email', 
        Validators.validateEmailVerification(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.verifyEmail();
        }
    );

    // Resend Verification Email
    router.post('/auth/resend-verification', 
        Validators.validateResendVerification(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.resendVerification();
        }
    );

    // MFA Verify (for login completion)
    router.post('/auth/mfa/verify', 
        Validators.validateMFAVerification(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.verifyMFA();
        }
    );

    // Get Available Roles (public for registration)
    router.get('/auth/roles', 
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.getRoles();
        }
    );

    // Social Login Routes (OAuth)
    router.get('/auth/google', 
        (req, res) => {
            // Redirect to Google OAuth
            const googleAuthUrl = `https://accounts.google.com/oauth/authorize?client_id=${config.googleClientId}&redirect_uri=${config.googleRedirectUri}&scope=email profile&response_type=code`;
            res.redirect(googleAuthUrl);
        }
    );

    router.get('/auth/linkedin', 
        (req, res) => {
            // Redirect to LinkedIn OAuth
            const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${config.linkedinClientId}&redirect_uri=${config.linkedinRedirectUri}&scope=r_liteprofile r_emailaddress`;
            res.redirect(linkedinAuthUrl);
        }
    );

    router.get('/auth/microsoft', 
        (req, res) => {
            // Redirect to Microsoft OAuth
            const microsoftAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${config.microsoftClientId}&response_type=code&redirect_uri=${config.microsoftRedirectUri}&scope=openid profile email`;
            res.redirect(microsoftAuthUrl);
        }
    );

    // Social Login Callback
    router.post('/auth/social/callback', 
        Validators.validateSocialCallback(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.handleSocialCallback();
        }
    );

    // Protected Routes (Authentication Required)

    // Logout
    router.post('/auth/logout', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.logout();
        }
    );

    // Change Password
    router.post('/auth/change-password', 
        Middleware.isUserAuthorized,
        Validators.validateChangePassword(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.changePassword();
        }
    );

    // Get Current User
    router.get('/auth/me', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.me();
        }
    );

    // Update Profile
    router.put('/auth/profile', 
        Middleware.isUserAuthorized,
        Validators.validateProfileUpdate(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.updateProfile();
        }
    );

    // MFA Management Routes

    // Enable MFA
    router.post('/auth/mfa/enable', 
        Middleware.isUserAuthorized,
        Validators.validateMFAEnable(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.enableMFA();
        }
    );

    // Disable MFA
    router.post('/auth/mfa/disable', 
        Middleware.isUserAuthorized,
        Validators.validateMFADisable(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.disableMFA();
        }
    );

    // Generate MFA Backup Codes
    router.post('/auth/mfa/backup-codes', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.generateBackupCodes();
        }
    );

    // Role Management Routes (Admin Only)

    // Update User Role
    router.put('/auth/role', 
        Middleware.isUserAuthorized,
        Validators.validateRoleUpdate(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.updateRole();
        }
    );

    // Request Role Change
    router.post('/auth/role-request', 
        Middleware.isUserAuthorized,
        Validators.validateRoleRequest(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.requestRole();
        }
    );

    // Get Permissions (Admin Only)
    router.get('/auth/permissions', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.getPermissions();
        }
    );

    // Company Management Routes

    // Get Company Members (IndustryAdmin only)
    router.get('/auth/company/members', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.getCompanyMembers();
        }
    );

    // Add Company Member (IndustryAdmin only)
    router.post('/auth/company/members', 
        Middleware.isUserAuthorized,
        Validators.validateAddMember(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.addCompanyMember();
        }
    );

    // Remove Company Member (IndustryAdmin only)
    router.delete('/auth/company/members/:memberId', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.removeCompanyMember();
        }
    );

    // Update Company Member Role (IndustryAdmin only)
    router.put('/auth/company/members/:memberId/role', 
        Middleware.isUserAuthorized,
        Validators.validateMemberRoleUpdate(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.updateMemberRole();
        }
    );

    // User Approval Workflow Routes (Admin Only)

    // Get Pending Approvals
    router.get('/auth/approvals/pending', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.getPendingApprovals();
        }
    );

    // Approve User
    router.post('/auth/approvals/:userId/approve', 
        Middleware.isUserAuthorized,
        Validators.validateUserApproval(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.approveUser();
        }
    );

    // Reject User
    router.post('/auth/approvals/:userId/reject', 
        Middleware.isUserAuthorized,
        Validators.validateUserRejection(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.rejectUser();
        }
    );

    // Get User Approval Status
    router.get('/auth/approval-status', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.getApprovalStatus();
        }
    );

    // Document Upload for Approval
    router.post('/auth/documents/upload', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new AuthController().boot(req, res);
            return controller.uploadApprovalDocument();
        }
    );

    app.use(config.baseApiUrl, router);
};
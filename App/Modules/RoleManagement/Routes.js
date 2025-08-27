const RoleManagementController = require('./Controller');

module.exports = (app, express) => {
    const router = express.Router();
    const Middleware = require("../../Services/Middleware");
    const Validators = require("./Validator");
    const config = require('../../../Configs/Config');

    // ==================== CUSTOM ROLE MANAGEMENT ROUTES ====================

    // Create Custom Role
    router.post('/admin/roles/custom', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        Validators.validateCreateCustomRole(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.createCustomRole();
        }
    );

    // Get Custom Roles
    router.get('/admin/roles/custom', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.getCustomRoles();
        }
    );

    // Update Custom Role
    router.put('/admin/roles/custom/:id', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        Validators.validateUpdateCustomRole(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.updateCustomRole();
        }
    );

    // Delete Custom Role
    router.delete('/admin/roles/custom/:id', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.deleteCustomRole();
        }
    );

    // ==================== SUB USER MANAGEMENT ROUTES ====================

    // Create Sub User
    router.post('/admin/users/sub-users', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        Validators.validateCreateSubUser(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.createSubUser();
        }
    );

    // Get Sub Users
    router.get('/admin/users/sub-users', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.getSubUsers();
        }
    );

    // Get Specific Sub User
    router.get('/admin/users/sub-users/:id', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.getSubUser();
        }
    );

    // Update Sub User
    router.put('/admin/users/sub-users/:id', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        Validators.validateUpdateSubUser(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.updateSubUser();
        }
    );

    // Update Sub User Status
    router.put('/admin/users/sub-users/:id/status', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        Validators.validateUpdateSubUserStatus(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.updateSubUserStatus();
        }
    );

    // Delete Sub User
    router.delete('/admin/users/sub-users/:id', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.deleteSubUser();
        }
    );

    // Resend Invitation
    router.post('/admin/users/sub-users/:id/resend-invitation', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.resendInvitation();
        }
    );

    // ==================== PERMISSION TEMPLATE ROUTES ====================

    // Get Permission Templates
    router.get('/admin/permissions/templates', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.getPermissionTemplates();
        }
    );

    // Create Permission Template
    router.post('/admin/permissions/templates', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['SuperAdmin']),
        Validators.validateCreatePermissionTemplate(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.createPermissionTemplate();
        }
    );

    // ==================== APPROVAL REQUEST ROUTES ====================

    // Get Approval Requests
    router.get('/admin/approvals', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.getApprovalRequests();
        }
    );

    // Process Approval Request
    router.post('/admin/approvals/:id/process', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        Validators.validateProcessApproval(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.processApprovalRequest();
        }
    );

    // Create Approval Request
    router.post('/admin/approvals', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        Validators.validateCreateApprovalRequest(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.createApprovalRequest();
        }
    );

    // ==================== ROLE ASSIGNMENT HISTORY ROUTES ====================

    // Get Role Assignment History
    router.get('/admin/roles/history', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.getRoleAssignmentHistory();
        }
    );

    // ==================== USER MANAGEMENT ROUTES ====================

    // Get All Users (including sub-users)
    router.get('/admin/users', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.getAllUsers();
        }
    );

    // Update User Status
    router.put('/admin/users/:id/status', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        Validators.validateUpdateUserStatus(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.updateUserStatus();
        }
    );

    // Assign Role to User
    router.put('/admin/users/:id/role', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        Validators.validateAssignRole(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.assignRole();
        }
    );

    // ==================== SYSTEM ROLES AND PERMISSIONS ROUTES ====================

    // Get System Roles
    router.get('/admin/roles/system', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.getSystemRoles();
        }
    );

    // Get Available Permissions
    router.get('/admin/permissions', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.getAvailablePermissions();
        }
    );

    // ==================== BULK OPERATIONS ROUTES ====================

    // Bulk Update Users
    router.post('/admin/users/bulk-update', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        Validators.validateBulkUpdateUsers(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.bulkUpdateUsers();
        }
    );

    // Bulk Assign Roles
    router.post('/admin/roles/bulk-assign', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        Validators.validateBulkAssignRoles(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.bulkAssignRoles();
        }
    );

    // ==================== AUDIT AND REPORTING ROUTES ====================

    // Get Audit Logs
    router.get('/admin/audit-logs', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.getAuditLogs();
        }
    );

    // Get User Activity Report
    router.get('/admin/reports/user-activity', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.getUserActivityReport();
        }
    );

    // Get Role Usage Report
    router.get('/admin/reports/role-usage', 
        Middleware.isUserAuthorized,
        Middleware.requireRole(['IndustryAdmin', 'VendorAdmin', 'SuperAdmin']),
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.getRoleUsageReport();
        }
    );

    // ==================== INVITATION MANAGEMENT ROUTES ====================

    // Accept Invitation
    router.post('/admin/invitations/accept', 
        Validators.validateAcceptInvitation(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.acceptInvitation();
        }
    );

    // Validate Invitation Token
    router.get('/admin/invitations/validate/:token', 
        (req, res) => {
            const controller = new RoleManagementController().boot(req, res);
            return controller.validateInvitationToken();
        }
    );

    app.use(config.baseApiUrl, router);
};
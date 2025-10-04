const Joi = require("joi");

class RoleManagementValidators {
    
    // ==================== CUSTOM ROLE VALIDATORS ====================

    static validateCreateCustomRole() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    name: Joi.string().trim().required().min(2).max(50)
                        .pattern(/^[a-zA-Z0-9_\s]+$/)
                        .message('Role name can only contain letters, numbers, underscores, and spaces'),
                    displayName: Joi.string().trim().required().min(2).max(100),
                    description: Joi.string().trim().max(500).optional(),
                    permissions: Joi.array().items(Joi.object({
                        module: Joi.string().required().valid(
                            'users', 'roles', 'requirements', 'rfqs', 'quotes', 
                            'purchaseOrders', 'documents', 'notifications', 
                            'messages', 'tracking', 'compliance', 'analytics'
                        ),
                        actions: Joi.array().items(
                            Joi.string().valid('create', 'read', 'update', 'delete', 'approve', 'export')
                        ).min(1).required(),
                        level: Joi.string().valid('none', 'own', 'team', 'company', 'all').default('own')
                    })).min(1).required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateUpdateCustomRole() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    name: Joi.string().trim().min(2).max(50)
                        .pattern(/^[a-zA-Z0-9_\s]+$/)
                        .message('Role name can only contain letters, numbers, underscores, and spaces')
                        .optional(),
                    displayName: Joi.string().trim().min(2).max(100).optional(),
                    description: Joi.string().trim().max(500).optional(),
                    permissions: Joi.array().items(Joi.object({
                        module: Joi.string().required().valid(
                            'users', 'roles', 'requirements', 'rfqs', 'quotes', 
                            'purchaseOrders', 'documents', 'notifications', 
                            'messages', 'tracking', 'compliance', 'analytics'
                        ),
                        actions: Joi.array().items(
                            Joi.string().valid('create', 'read', 'update', 'delete', 'approve', 'export')
                        ).min(1).required(),
                        level: Joi.string().valid('none', 'own', 'team', 'company', 'all').default('own')
                    })).optional(),
                    isActive: Joi.boolean().optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== SUB USER VALIDATORS ====================

    static validateCreateSubUser() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    email: Joi.string().email().trim().required(),
                    firstName: Joi.string().trim().required().min(2).max(50),
                    lastName: Joi.string().trim().required().min(2).max(50),
                    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
                    customRole: Joi.string().optional(),
                    systemRole: Joi.string().valid('IndustryMember', 'VendorMember', 'TeamLead', 'Manager').optional(),
                    department: Joi.string().trim().max(100).optional(),
                    position: Joi.string().trim().max(100).optional(),
                    reportingTo: Joi.string().optional(),
                    permissions: Joi.array().items(Joi.object({
                        module: Joi.string().required().valid(
                            'users', 'roles', 'requirements', 'rfqs', 'quotes', 
                            'purchaseOrders', 'documents', 'notifications', 
                            'messages', 'tracking', 'compliance', 'analytics'
                        ),
                        actions: Joi.array().items(
                            Joi.string().valid('create', 'read', 'update', 'delete', 'approve', 'export')
                        ).min(1).required(),
                        level: Joi.string().valid('none', 'own', 'team', 'company', 'all').default('own')
                    })).optional(),
                    sendInvitation: Joi.boolean().default(true)
                }).or('customRole', 'systemRole');
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateUpdateSubUser() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    firstName: Joi.string().trim().min(2).max(50).optional(),
                    lastName: Joi.string().trim().min(2).max(50).optional(),
                    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
                    customRole: Joi.string().optional(),
                    systemRole: Joi.string().valid('IndustryMember', 'VendorMember', 'TeamLead', 'Manager').optional(),
                    department: Joi.string().trim().max(100).optional(),
                    position: Joi.string().trim().max(100).optional(),
                    reportingTo: Joi.string().optional(),
                    permissions: Joi.array().items(Joi.object({
                        module: Joi.string().required().valid(
                            'users', 'roles', 'requirements', 'rfqs', 'quotes', 
                            'purchaseOrders', 'documents', 'notifications', 
                            'messages', 'tracking', 'compliance', 'analytics'
                        ),
                        actions: Joi.array().items(
                            Joi.string().valid('create', 'read', 'update', 'delete', 'approve', 'export')
                        ).min(1).required(),
                        level: Joi.string().valid('none', 'own', 'team', 'company', 'all').default('own')
                    })).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateUpdateSubUserStatus() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    status: Joi.string().valid('pending', 'active', 'inactive', 'suspended').required(),
                    reason: Joi.string().trim().max(500).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== PERMISSION TEMPLATE VALIDATORS ====================

    static validateCreatePermissionTemplate() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    name: Joi.string().trim().required().min(2).max(50),
                    displayName: Joi.string().trim().required().min(2).max(100),
                    description: Joi.string().trim().max(500).optional(),
                    category: Joi.string().valid('basic', 'advanced', 'manager', 'admin').default('basic'),
                    permissions: Joi.array().items(Joi.object({
                        module: Joi.string().required().valid(
                            'users', 'roles', 'requirements', 'rfqs', 'quotes', 
                            'purchaseOrders', 'documents', 'notifications', 
                            'messages', 'tracking', 'compliance', 'analytics'
                        ),
                        actions: Joi.array().items(
                            Joi.string().valid('create', 'read', 'update', 'delete', 'approve', 'export')
                        ).min(1).required(),
                        level: Joi.string().valid('none', 'own', 'team', 'company', 'all').default('own')
                    })).min(1).required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== APPROVAL REQUEST VALIDATORS ====================

    static validateCreateApprovalRequest() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    requestType: Joi.string().valid('user_creation', 'role_change', 'permission_change', 'status_change').required(),
                    targetUserId: Joi.string().required(),
                    targetUserType: Joi.string().valid('User', 'SubUser').required(),
                    requestData: Joi.object().required(),
                    approvalLevel: Joi.string().valid('manager', 'admin', 'super_admin').required(),
                    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
                    reason: Joi.string().trim().max(1000).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateProcessApproval() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    action: Joi.string().valid('approve', 'reject').required(),
                    comments: Joi.string().trim().max(1000).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== USER MANAGEMENT VALIDATORS ====================

    static validateUpdateUserStatus() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    status: Joi.string().valid('active', 'inactive', 'suspended', 'pending').required(),
                    reason: Joi.string().trim().max(500).optional(),
                    effectiveDate: Joi.date().min('now').optional(),
                    expiryDate: Joi.date().min(Joi.ref('effectiveDate')).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateAssignRole() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    roleType: Joi.string().valid('system', 'custom').required(),
                    roleId: Joi.string().when('roleType', {
                        is: 'custom',
                        then: Joi.required(),
                        otherwise: Joi.optional()
                    }),
                    systemRole: Joi.string().when('roleType', {
                        is: 'system',
                        then: Joi.valid('IndustryMember', 'VendorMember', 'TeamLead', 'Manager').required(),
                        otherwise: Joi.optional()
                    }),
                    reason: Joi.string().trim().max(500).optional(),
                    effectiveDate: Joi.date().min('now').optional(),
                    expiryDate: Joi.date().min(Joi.ref('effectiveDate')).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== BULK OPERATION VALIDATORS ====================

    static validateBulkUpdateUsers() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    userIds: Joi.array().items(Joi.string()).min(1).max(100).required(),
                    updateData: Joi.object({
                        status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
                        department: Joi.string().trim().max(100).optional(),
                        position: Joi.string().trim().max(100).optional(),
                        reportingTo: Joi.string().optional()
                    }).min(1).required(),
                    reason: Joi.string().trim().max(500).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateBulkAssignRoles() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    userIds: Joi.array().items(Joi.string()).min(1).max(100).required(),
                    roleType: Joi.string().valid('system', 'custom').required(),
                    roleId: Joi.string().when('roleType', {
                        is: 'custom',
                        then: Joi.required(),
                        otherwise: Joi.optional()
                    }),
                    systemRole: Joi.string().when('roleType', {
                        is: 'system',
                        then: Joi.valid('IndustryMember', 'VendorMember', 'TeamLead', 'Manager').required(),
                        otherwise: Joi.optional()
                    }),
                    reason: Joi.string().trim().max(500).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== INVITATION VALIDATORS ====================

    static validateAcceptInvitation() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    token: Joi.string().required(),
                    password: Joi.string().min(8).max(128).required()
                        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
                        .message('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
                    firstName: Joi.string().trim().min(2).max(50).optional(),
                    lastName: Joi.string().trim().min(2).max(50).optional(),
                    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== SEARCH AND FILTER VALIDATORS ====================

    static validateUserSearch() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    query: Joi.string().trim().min(1).max(100).optional(),
                    status: Joi.string().valid('pending', 'active', 'inactive', 'suspended').optional(),
                    department: Joi.string().trim().max(100).optional(),
                    role: Joi.string().optional(),
                    dateFrom: Joi.date().optional(),
                    dateTo: Joi.date().min(Joi.ref('dateFrom')).optional(),
                    page: Joi.number().min(1).default(1),
                    limit: Joi.number().min(1).max(100).default(20),
                    sortBy: Joi.string().valid('createdAt', 'firstName', 'lastName', 'email', 'status').default('createdAt'),
                    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateRoleSearch() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    query: Joi.string().trim().min(1).max(100).optional(),
                    isActive: Joi.boolean().optional(),
                    isSystemRole: Joi.boolean().optional(),
                    page: Joi.number().min(1).default(1),
                    limit: Joi.number().min(1).max(100).default(20),
                    sortBy: Joi.string().valid('createdAt', 'name', 'displayName').default('createdAt'),
                    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== AUDIT LOG VALIDATORS ====================

    static validateAuditLogQuery() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    action: Joi.string().optional(),
                    performedBy: Joi.string().optional(),
                    targetUser: Joi.string().optional(),
                    category: Joi.string().valid('role_management', 'user_management', 'permission_change', 'approval').optional(),
                    severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
                    dateFrom: Joi.date().optional(),
                    dateTo: Joi.date().min(Joi.ref('dateFrom')).optional(),
                    page: Joi.number().min(1).default(1),
                    limit: Joi.number().min(1).max(100).default(20)
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    // ==================== REPORT VALIDATORS ====================

    static validateReportQuery() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    reportType: Joi.string().valid('user_activity', 'role_usage', 'permission_audit').required(),
                    dateFrom: Joi.date().optional(),
                    dateTo: Joi.date().min(Joi.ref('dateFrom')).optional(),
                    format: Joi.string().valid('json', 'csv', 'pdf').default('json'),
                    includeInactive: Joi.boolean().default(false),
                    groupBy: Joi.string().valid('department', 'role', 'status', 'date').optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }
}

module.exports = RoleManagementValidators;
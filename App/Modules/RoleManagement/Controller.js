const Controller = require("../Base/Controller");
const Middleware = require("../../Services/Middleware");
const {
  CustomRole,
  SubUser,
  RoleAssignmentHistory,
  PermissionTemplate,
  UserApprovalRequest,
  RoleManagementAudit,
} = require("./Schema");
const { UserSchema } = require("../Users/Schema");
const { Role } = require("../Auth/Schema");
const NotificationService = require("../../Services/NotificationService");
const Email = require("../../Services/Email");
const bcryptjs = require("bcryptjs");
const crypto = require("crypto");
const _ = require("lodash");

class RoleManagementController extends Controller {
  constructor() {
    super();
    this.notificationService = new NotificationService();
    this.emailService = new Email();
  }

  // ==================== MISSING METHODS ====================
  // -------------------- SUB USER --------------------

  // Get Specific Sub User
  async getSubUser() {
    try {
      const { id } = this.req.params;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);
      const subUser = await SubUser.findOne({
        _id: id,
        parentUserId: userId,
        companyId: user.profileId,
      })
        .populate("customRole", "name displayName permissions")
        .populate("reportingTo", "firstName lastName email")
        .populate("createdBy", "email");

      if (!subUser) {
        return this.res.status(404).send({
          status: false,
          message: "Sub user not found",
        });
      }

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Sub user retrieved successfully",
        data: subUser,
      });
    } catch (error) {
      console.error("Error retrieving sub user:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  // Delete Sub User
  async deleteSubUser() {
    try {
      const { id } = this.req.params;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);
      const subUser = await SubUser.findOne({
        _id: id,
        parentUserId: userId,
        companyId: user.profileId,
      });

      if (!subUser) {
        return this.res
          .status(404)
          .send({ status: false, message: "Sub user not found" });
      }

      await subUser.deleteOne();

      await this.logAudit({
        action: "DELETE_SUB_USER",
        performedBy: userId,
        targetUser: subUser._id,
        targetUserType: "SubUser",
        companyId: user.profileId,
        details: { before: subUser.toObject() },
        category: "user_management",
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Sub user deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting sub user:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  // Resend Invitation
  async resendInvitation() {
    try {
      const { id } = this.req.params;
      const userId = this.req.user.id;

      const subUser = await SubUser.findOne({
        _id: id,
        parentUserId: userId,
      });

      if (!subUser) {
        return this.res
          .status(404)
          .send({ status: false, message: "Sub user not found" });
      }

      // Generate new token
      const token = crypto.randomBytes(32).toString("hex");
      subUser.invitationToken = token;
      subUser.invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await subUser.save();

      await this.sendInvitationEmail(subUser, token);

      await this.logAudit({
        action: "RESEND_INVITATION",
        performedBy: userId,
        targetUser: subUser._id,
        targetUserType: "SubUser",
        companyId: subUser.companyId,
        details: { after: subUser.toObject() },
        category: "user_management",
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Invitation resent successfully",
      });
    } catch (error) {
      console.error("Error resending invitation:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  // -------------------- PERMISSION TEMPLATES --------------------

  // Create Permission Template
  async createPermissionTemplate() {
    try {
      const { name, category, permissions } = this.req.body;
      const userId = this.req.user.id;

      const template = new PermissionTemplate({
        name,
        category,
        permissions,
        createdBy: userId,
      });

      await template.save();

      await this.logAudit({
        action: "CREATE_PERMISSION_TEMPLATE",
        performedBy: userId,
        companyId: null,
        details: { after: template.toObject() },
        category: "permission_management",
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Permission template created successfully",
        data: template,
      });
    } catch (error) {
      console.error("Error creating permission template:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  // -------------------- APPROVAL REQUESTS --------------------

  // Create Approval Request
  async createApprovalRequest() {
    try {
      const { requestType, targetUserId, targetUserType, requestData } =
        this.req.body;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);

      const approvalRequest = new UserApprovalRequest({
        requestType,
        targetUserId,
        targetUserType,
        requestData,
        requestedBy: userId,
        companyId: user.profileId,
        status: "pending",
      });

      await approvalRequest.save();

      await this.logAudit({
        action: "CREATE_APPROVAL_REQUEST",
        performedBy: userId,
        companyId: user.profileId,
        details: { after: approvalRequest.toObject() },
        category: "approval",
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Approval request created successfully",
        data: approvalRequest,
      });
    } catch (error) {
      console.error("Error creating approval request:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  // -------------------- USER MANAGEMENT --------------------

  // Get All Users
  async getAllUsers() {
    try {
      const userId = this.req.user.id;
      const user = await UserSchema.findById(userId);

      const users = await UserSchema.find({ profileId: user.profileId })
        .select("-password")
        .sort({ createdAt: -1 });

      const subUsers = await SubUser.find({ companyId: user.profileId }).sort({
        createdAt: -1,
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Users retrieved successfully",
        data: { users, subUsers },
      });
    } catch (error) {
      console.error("Error retrieving all users:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  // Update User Status
  async updateUserStatus() {
    try {
      const { id } = this.req.params;
      const { status } = this.req.body;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(id);
      if (!user)
        return this.res
          .status(404)
          .send({ status: false, message: "User not found" });

      const previousStatus = user.status;
      user.status = status;
      await user.save();

      await this.logAudit({
        action: "UPDATE_USER_STATUS",
        performedBy: userId,
        targetUser: user._id,
        targetUserType: "User",
        companyId: user.profileId,
        details: { before: { status: previousStatus }, after: { status } },
        category: "user_management",
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "User status updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  // Assign Role to User
  async assignRole() {
    try {
      const { id } = this.req.params;
      const { customRole, systemRole } = this.req.body;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(id);
      if (!user)
        return this.res
          .status(404)
          .send({ status: false, message: "User not found" });

      const previousRole = {
        customRole: user.customRole,
        systemRole: user.systemRole,
      };
      user.customRole = customRole || user.customRole;
      user.systemRole = systemRole || user.systemRole;
      await user.save();

      await this.logRoleAssignment(user, previousRole, userId);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Role assigned successfully",
        data: user,
      });
    } catch (error) {
      console.error("Error assigning role:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  // -------------------- SYSTEM ROLES & PERMISSIONS --------------------

  async getSystemRoles() {
    try {
      const roles = await Role.find({ isActive: true });
      this.res.send({
        status: true,
        statusCode: 200,
        message: "System roles retrieved successfully",
        data: roles,
      });
    } catch (error) {
      console.error("Error retrieving system roles:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  async getAvailablePermissions() {
    try {
      // Aggregate permissions from all templates
      const templates = await PermissionTemplate.find({ isActive: true });
      const permissions = _.uniq(
        _.flatten(templates.map((t) => t.permissions))
      );
      this.res.send({
        status: true,
        statusCode: 200,
        message: "Available permissions retrieved successfully",
        data: permissions,
      });
    } catch (error) {
      console.error("Error retrieving permissions:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  // -------------------- BULK OPERATIONS --------------------

  async bulkUpdateUsers() {
    try {
      const { users } = this.req.body; // [{ userId, data }]
      const userId = this.req.user.id;

      const results = [];
      for (const u of users) {
        const user = await UserSchema.findById(u.userId);
        if (!user) continue;

        const beforeData = user.toObject();
        Object.assign(user, u.data);
        await user.save();

        await this.logAudit({
          action: "BULK_UPDATE_USER",
          performedBy: userId,
          targetUser: user._id,
          targetUserType: "User",
          companyId: user.profileId,
          details: { before: beforeData, after: user.toObject() },
          category: "user_management",
        });

        results.push(user);
      }

      this.res.send({
        status: true,
        message: "Bulk users updated",
        data: results,
      });
    } catch (error) {
      console.error("Error in bulk updating users:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  async bulkAssignRoles() {
    try {
      const { users } = this.req.body; // [{ userId, role }]
      const userId = this.req.user.id;

      const results = [];
      for (const u of users) {
        const user = await UserSchema.findById(u.userId);
        if (!user) continue;

        const previousRole = {
          customRole: user.customRole,
          systemRole: user.systemRole,
        };
        Object.assign(user, u.role);
        await user.save();

        await this.logRoleAssignment(user, previousRole, userId);
        results.push(user);
      }

      this.res.send({
        status: true,
        message: "Bulk roles assigned",
        data: results,
      });
    } catch (error) {
      console.error("Error in bulk role assignment:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  // -------------------- AUDIT & REPORTS --------------------

  async getAuditLogs() {
    try {
      const logs = await AuditLog.find().sort({ createdAt: -1 });
      this.res.send({ status: true, data: logs });
    } catch (error) {
      console.error("Error retrieving audit logs:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  async getUserActivityReport() {
    try {
      // Implement aggregation for user activity
      const report = await UserActivity.aggregate([
        {
          $group: {
            _id: "$userId",
            actions: { $push: "$$ROOT" },
            count: { $sum: 1 },
          },
        },
      ]);

      this.res.send({ status: true, data: report });
    } catch (error) {
      console.error("Error generating user activity report:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  async getRoleUsageReport() {
    try {
      const report = await UserSchema.aggregate([
        { $group: { _id: "$customRole", count: { $sum: 1 } } },
      ]);

      this.res.send({ status: true, data: report });
    } catch (error) {
      console.error("Error generating role usage report:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  // -------------------- INVITATION MANAGEMENT --------------------

  async acceptInvitation() {
    try {
      const { token } = this.req.body;
      const subUser = await SubUser.findOne({ invitationToken: token });

      if (!subUser || subUser.invitationExpiry < new Date()) {
        return this.res
          .status(400)
          .send({ status: false, message: "Invalid or expired invitation" });
      }

      subUser.invitationToken = null;
      subUser.invitationExpiry = null;
      subUser.status = "active";
      await subUser.save();

      this.res.send({
        status: true,
        message: "Invitation accepted successfully",
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  async validateInvitationToken() {
    try {
      const { token } = this.req.params;
      const subUser = await SubUser.findOne({ invitationToken: token });

      if (!subUser || subUser.invitationExpiry < new Date()) {
        return this.res.status(400).send({
          status: false,
          message: "Invalid or expired invitation token",
        });
      }

      this.res.send({ status: true, message: "Valid token", data: subUser });
    } catch (error) {
      console.error("Error validating invitation token:", error);
      this.res
        .status(500)
        .send({ status: false, message: "Internal server error" });
    }
  }

  // -------------------- HELPER --------------------
  async logRoleAssignment(user, previousRole, performedBy) {
    await this.logAudit({
      action: "ASSIGN_ROLE",
      performedBy,
      targetUser: user._id,
      targetUserType: "User",
      companyId: user.profileId,
      details: {
        before: previousRole,
        after: { customRole: user.customRole, systemRole: user.systemRole },
      },
      category: "role_management",
    });
  }

  // ==================== CUSTOM ROLE MANAGEMENT ====================

  // Create Custom Role
  async createCustomRole() {
    try {
      const { name, displayName, description, permissions } = this.req.body;
      const userId = this.req.user.id;
      const userRole = this.req.user.role;

      // Get user's company info
      const user = await UserSchema.findById(userId).populate("profileId");
      if (!user) {
        return this.res.status(404).send({
          status: false,
          message: "User not found",
        });
      }

      const companyType = userRole.includes("Industry") ? "industry" : "vendor";

      // Check if role name already exists for this company
      const existingRole = await CustomRole.findOne({
        name: name.trim(),
        companyId: user.profileId,
        isActive: true,
      });

      if (existingRole) {
        return this.res.status(400).send({
          status: false,
          message: "Role name already exists in your organization",
        });
      }

      // Create custom role
      const customRole = new CustomRole({
        name: name.trim(),
        displayName: displayName.trim(),
        description,
        companyId: user.profileId,
        companyType,
        permissions,
        createdBy: userId,
      });

      await customRole.save();

      // Log audit trail
      await this.logAudit({
        action: "CREATE_CUSTOM_ROLE",
        performedBy: userId,
        companyId: user.profileId,
        details: {
          after: customRole.toObject(),
        },
        category: "role_management",
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Custom role created successfully",
        data: customRole,
      });
    } catch (error) {
      console.error("Error creating custom role:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Get Custom Roles
  async getCustomRoles() {
    try {
      const { page = 1, limit = 20, isActive } = this.req.query;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);
      const filter = {
        companyId: user.profileId,
        ...(isActive !== undefined && { isActive: isActive === "true" }),
      };

      const roles = await CustomRole.find(filter)
        .populate("createdBy", "email")
        .populate("updatedBy", "email")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await CustomRole.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Custom roles retrieved successfully",
        data: {
          roles,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving custom roles:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Update Custom Role
  async updateCustomRole() {
    try {
      const { id } = this.req.params;
      const updateData = this.req.body;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);
      const role = await CustomRole.findOne({
        _id: id,
        companyId: user.profileId,
      });

      if (!role) {
        return this.res.status(404).send({
          status: false,
          message: "Custom role not found",
        });
      }

      const beforeData = role.toObject();

      // Update role
      Object.assign(role, updateData);
      role.updatedBy = userId;
      await role.save();

      // Log audit trail
      await this.logAudit({
        action: "UPDATE_CUSTOM_ROLE",
        performedBy: userId,
        companyId: user.profileId,
        details: {
          before: beforeData,
          after: role.toObject(),
          changes: updateData,
        },
        category: "role_management",
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Custom role updated successfully",
        data: role,
      });
    } catch (error) {
      console.error("Error updating custom role:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Delete Custom Role
  async deleteCustomRole() {
    try {
      const { id } = this.req.params;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);
      const role = await CustomRole.findOne({
        _id: id,
        companyId: user.profileId,
      });

      if (!role) {
        return this.res.status(404).send({
          status: false,
          message: "Custom role not found",
        });
      }

      // Check if role is assigned to any users
      const assignedUsers = await SubUser.countDocuments({ customRole: id });
      if (assignedUsers > 0) {
        return this.res.status(400).send({
          status: false,
          message: `Cannot delete role. It is assigned to ${assignedUsers} user(s)`,
        });
      }

      // Soft delete
      role.isActive = false;
      role.updatedBy = userId;
      await role.save();

      // Log audit trail
      await this.logAudit({
        action: "DELETE_CUSTOM_ROLE",
        performedBy: userId,
        companyId: user.profileId,
        details: {
          before: role.toObject(),
        },
        category: "role_management",
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Custom role deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting custom role:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // ==================== SUB USER MANAGEMENT ====================

  // Create Sub User
  async createSubUser() {
    try {
      const {
        email,
        firstName,
        lastName,
        phone,
        customRole,
        systemRole,
        department,
        position,
        reportingTo,
        permissions,
      } = this.req.body;
      const userId = this.req.user.id;

      // Check if email already exists
      const existingUser = await UserSchema.findOne({
        email: email.toLowerCase(),
      });
      const existingSubUser = await SubUser.findOne({
        email: email.toLowerCase(),
      });

      if (existingUser || existingSubUser) {
        return this.res.status(400).send({
          status: false,
          message: "Email already exists",
        });
      }

      const user = await UserSchema.findById(userId);
      const companyType = this.req.user.role.includes("Industry")
        ? "industry"
        : "vendor";

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString("hex");
      const invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create sub user
      const subUser = new SubUser({
        parentUserId: userId,
        companyId: user.profileId,
        companyType,
        email: email.toLowerCase(),
        firstName,
        lastName,
        phone,
        customRole,
        systemRole,
        department,
        position,
        reportingTo,
        permissions,
        invitationToken,
        invitationExpiry,
        createdBy: userId,
      });

      await subUser.save();

      // Send invitation email
      await this.sendInvitationEmail(subUser, invitationToken);

      // Log audit trail
      await this.logAudit({
        action: "CREATE_SUB_USER",
        performedBy: userId,
        targetUser: subUser._id,
        targetUserType: "SubUser",
        companyId: user.profileId,
        details: {
          after: subUser.toObject(),
        },
        category: "user_management",
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Sub user created and invitation sent successfully",
        data: {
          ...subUser.toObject(),
          invitationToken: undefined, // Don't expose token
        },
      });
    } catch (error) {
      console.error("Error creating sub user:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Get Sub Users
  async getSubUsers() {
    try {
      const { page = 1, limit = 20, status, department } = this.req.query;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);
      const filter = {
        parentUserId: userId,
        companyId: user.profileId,
      };

      if (status) filter.status = status;
      if (department) filter.department = department;

      const subUsers = await SubUser.find(filter)
        .populate("customRole", "name displayName permissions")
        .populate("reportingTo", "firstName lastName email")
        .populate("createdBy", "email")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await SubUser.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Sub users retrieved successfully",
        data: {
          subUsers,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving sub users:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Update Sub User
  async updateSubUser() {
    try {
      const { id } = this.req.params;
      const updateData = this.req.body;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);
      const subUser = await SubUser.findOne({
        _id: id,
        parentUserId: userId,
        companyId: user.profileId,
      });

      if (!subUser) {
        return this.res.status(404).send({
          status: false,
          message: "Sub user not found",
        });
      }

      const beforeData = subUser.toObject();

      // Update sub user
      Object.assign(subUser, updateData);
      await subUser.save();

      // Log role assignment history if role changed
      if (updateData.customRole || updateData.systemRole) {
        await this.logRoleAssignment(subUser, beforeData, userId);
      }

      // Log audit trail
      await this.logAudit({
        action: "UPDATE_SUB_USER",
        performedBy: userId,
        targetUser: subUser._id,
        targetUserType: "SubUser",
        companyId: user.profileId,
        details: {
          before: beforeData,
          after: subUser.toObject(),
          changes: updateData,
        },
        category: "user_management",
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Sub user updated successfully",
        data: subUser,
      });
    } catch (error) {
      console.error("Error updating sub user:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Update Sub User Status
  async updateSubUserStatus() {
    try {
      const { id } = this.req.params;
      const { status, reason } = this.req.body;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);
      const subUser = await SubUser.findOne({
        _id: id,
        parentUserId: userId,
        companyId: user.profileId,
      });

      if (!subUser) {
        return this.res.status(404).send({
          status: false,
          message: "Sub user not found",
        });
      }

      const previousStatus = subUser.status;
      subUser.status = status;

      if (status === "active") {
        subUser.approvedBy = userId;
        subUser.approvedAt = new Date();
      }

      await subUser.save();

      // Send notification to sub user
      if (status === "active") {
        await this.notificationService.send({
          userId: subUser._id,
          title: "Account Activated",
          message:
            "Your account has been activated. You can now access the platform.",
          type: "success",
          channels: { email: true, inApp: true },
        });
      }

      // Log audit trail
      await this.logAudit({
        action: "UPDATE_SUB_USER_STATUS",
        performedBy: userId,
        targetUser: subUser._id,
        targetUserType: "SubUser",
        companyId: user.profileId,
        details: {
          before: { status: previousStatus },
          after: { status },
          changes: { status, reason },
        },
        category: "user_management",
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Sub user status updated successfully",
        data: subUser,
      });
    } catch (error) {
      console.error("Error updating sub user status:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // ==================== PERMISSION TEMPLATES ====================

  // Get Permission Templates
  async getPermissionTemplates() {
    try {
      const { category } = this.req.query;

      const filter = { isActive: true };
      if (category) filter.category = category;

      const templates = await PermissionTemplate.find(filter)
        .populate("createdBy", "email")
        .sort({ category: 1, name: 1 });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Permission templates retrieved successfully",
        data: templates,
      });
    } catch (error) {
      console.error("Error retrieving permission templates:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // ==================== APPROVAL REQUESTS ====================

  // Get Approval Requests
  async getApprovalRequests() {
    try {
      const { page = 1, limit = 20, status, requestType } = this.req.query;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);
      const filter = {
        companyId: user.profileId,
        ...(status && { status }),
        ...(requestType && { requestType }),
      };

      const requests = await UserApprovalRequest.find(filter)
        .populate("requestedBy", "email firstName lastName")
        .populate("targetUserId")
        .populate("approvers.userId", "email")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await UserApprovalRequest.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Approval requests retrieved successfully",
        data: {
          requests,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving approval requests:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Process Approval Request
  async processApprovalRequest() {
    try {
      const { id } = this.req.params;
      const { action, comments } = this.req.body; // 'approve' or 'reject'
      const userId = this.req.user.id;

      const request = await UserApprovalRequest.findById(id);
      if (!request) {
        return this.res.status(404).send({
          status: false,
          message: "Approval request not found",
        });
      }

      // Update approval status
      request.status = action === "approve" ? "approved" : "rejected";
      request.finalApprover = userId;
      request.finalApprovalDate = new Date();

      if (action === "reject") {
        request.rejectionReason = comments;
      }

      await request.save();

      // If approved, apply the changes
      if (action === "approve") {
        await this.applyApprovalChanges(request);
      }

      // Send notification to requester
      await this.notificationService.send({
        userId: request.requestedBy,
        title: `Request ${action === "approve" ? "Approved" : "Rejected"}`,
        message: `Your ${request.requestType} request has been ${action}d.`,
        type: action === "approve" ? "success" : "warning",
        channels: { email: true, inApp: true },
      });

      // Log audit trail
      await this.logAudit({
        action: "PROCESS_APPROVAL_REQUEST",
        performedBy: userId,
        companyId: request.companyId,
        details: {
          requestId: request._id,
          action,
          comments,
        },
        category: "approval",
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: `Request ${action}d successfully`,
        data: request,
      });
    } catch (error) {
      console.error("Error processing approval request:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // ==================== ROLE ASSIGNMENT HISTORY ====================

  // Get Role Assignment History
  async getRoleAssignmentHistory() {
    try {
      const { page = 1, limit = 20, userId: targetUserId } = this.req.query;
      const userId = this.req.user.id;

      const user = await UserSchema.findById(userId);
      const filter = { companyId: user.profileId };

      if (targetUserId) {
        filter.userId = targetUserId;
      }

      const history = await RoleAssignmentHistory.find(filter)
        .populate("assignedBy", "email")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await RoleAssignmentHistory.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Role assignment history retrieved successfully",
        data: {
          history,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving role assignment history:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // ==================== HELPER METHODS ====================

  async sendInvitationEmail(subUser, token) {
    try {
      const invitationUrl = `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/accept-invitation?token=${token}`;

      const mailOptions = {
        to: subUser.email,
        subject: "Invitation to Join Organization",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>You're Invited!</h2>
            <p>Hello ${subUser.firstName} ${subUser.lastName},</p>
            <p>You have been invited to join our organization. Click the link below to accept the invitation and set up your account:</p>
            <a href="${invitationUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
            <p>This invitation will expire in 7 days.</p>
            <p>If you didn't expect this invitation, please ignore this email.</p>
          </div>
        `,
      };

      await this.emailService.send(mailOptions);
    } catch (error) {
      console.error("Error sending invitation email:", error);
    }
  }

  async logRoleAssignment(subUser, beforeData, assignedBy) {
    try {
      const history = new RoleAssignmentHistory({
        userId: subUser._id,
        userType: "SubUser",
        previousRole: {
          type: beforeData.customRole ? "custom" : "system",
          roleId: beforeData.customRole || null,
          roleName: beforeData.systemRole || beforeData.customRole?.name,
        },
        newRole: {
          type: subUser.customRole ? "custom" : "system",
          roleId: subUser.customRole || null,
          roleName: subUser.systemRole || subUser.customRole?.name,
        },
        assignedBy,
        companyId: subUser.companyId,
      });

      await history.save();
    } catch (error) {
      console.error("Error logging role assignment:", error);
    }
  }

  async applyApprovalChanges(request) {
    try {
      const { requestType, targetUserId, targetUserType, requestData } =
        request;

      if (targetUserType === "SubUser") {
        const subUser = await SubUser.findById(targetUserId);
        if (subUser) {
          Object.assign(subUser, requestData);
          await subUser.save();
        }
      } else if (targetUserType === "User") {
        const user = await UserSchema.findById(targetUserId);
        if (user) {
          Object.assign(user, requestData);
          await user.save();
        }
      }
    } catch (error) {
      console.error("Error applying approval changes:", error);
    }
  }

  async logAudit(auditData) {
    try {
      const audit = new RoleManagementAudit({
        ...auditData,
        ipAddress: this.req.ip,
        userAgent: this.req.get("User-Agent"),
        sessionId: this.req.sessionID,
      });

      await audit.save();
    } catch (error) {
      console.error("Error logging audit:", error);
    }
  }
}

module.exports = RoleManagementController;

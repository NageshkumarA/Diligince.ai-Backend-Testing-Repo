const mongoose = require("mongoose");
const { Schema } = mongoose;

// Audit Log Schema
const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    changes: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
    },
    outcome: {
      type: String,
      enum: ["success", "failure", "warning"],
      default: "success",
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for performance
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1, severity: 1 });
auditLogSchema.index({ outcome: 1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

class AuditService {
  async log(auditData) {
    try {
      const auditLog = new AuditLog({
        ...auditData,
        timestamp: new Date(),
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error("Error creating audit log:", error);
      // Don't throw error to prevent breaking main functionality
      return null;
    }
  }

  async getAuditLogs(filters = {}, options = {}) {
    try {
      const { page = 1, limit = 50 } = options;
      const { userId, resource, action, severity, startDate, endDate } =
        filters;

      const filter = {};

      if (userId) filter.userId = userId;
      if (resource) filter.resource = resource;
      if (action) filter.action = action;
      if (severity) filter.severity = severity;

      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }

      const auditLogs = await AuditLog.find(filter)
        .populate("userId", "email role")
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await AuditLog.countDocuments(filter);

      return {
        auditLogs,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      };
    } catch (error) {
      console.error("Error retrieving audit logs:", error);
      throw error;
    }
  }

  async getResourceAuditTrail(resource, resourceId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;

      const auditLogs = await AuditLog.find({
        resource,
        resourceId,
      })
        .populate("userId", "email role")
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await AuditLog.countDocuments({ resource, resourceId });

      return {
        auditLogs,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      };
    } catch (error) {
      console.error("Error retrieving resource audit trail:", error);
      throw error;
    }
  }

  async getUserActivity(userId, options = {}) {
    try {
      const { page = 1, limit = 20, days = 30 } = options;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const auditLogs = await AuditLog.find({
        userId,
        timestamp: { $gte: startDate },
      })
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await AuditLog.countDocuments({
        userId,
        timestamp: { $gte: startDate },
      });

      // Get activity summary
      const activitySummary = await AuditLog.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      return {
        auditLogs,
        activitySummary,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      };
    } catch (error) {
      console.error("Error retrieving user activity:", error);
      throw error;
    }
  }

  async getSecurityEvents(options = {}) {
    try {
      const { page = 1, limit = 50, severity = "high" } = options;

      const securityActions = [
        "LOGIN_FAILED",
        "UNAUTHORIZED_ACCESS",
        "PERMISSION_DENIED",
        "SUSPICIOUS_ACTIVITY",
        "DATA_BREACH_ATTEMPT",
        "MULTIPLE_LOGIN_ATTEMPTS",
      ];

      const filter = {
        $or: [
          { action: { $in: securityActions } },
          { severity: { $in: ["high", "critical"] } },
          { outcome: "failure" },
        ],
      };

      const securityEvents = await AuditLog.find(filter)
        .populate("userId", "email role")
        .sort({ timestamp: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await AuditLog.countDocuments(filter);

      return {
        securityEvents,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
        },
      };
    } catch (error) {
      console.error("Error retrieving security events:", error);
      throw error;
    }
  }

  async generateComplianceReport(startDate, endDate, standards = []) {
    try {
      const filter = {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };

      // ISO compliance related actions
      const complianceActions = [
        "CREATE_REQUIREMENT",
        "APPROVE_REQUIREMENT",
        "CREATE_PURCHASE_ORDER",
        "APPROVE_PURCHASE_ORDER",
        "COMPLIANCE_ASSESSMENT",
        "QUALITY_CHECK",
        "RISK_ASSESSMENT",
      ];

      if (standards.length > 0) {
        filter.action = { $in: complianceActions };
      }

      const complianceData = await AuditLog.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              action: "$action",
              outcome: "$outcome",
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$timestamp",
                },
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.action",
            outcomes: {
              $push: {
                outcome: "$_id.outcome",
                date: "$_id.date",
                count: "$count",
              },
            },
            totalCount: { $sum: "$count" },
          },
        },
        {
          $sort: { totalCount: -1 },
        },
      ]);

      return {
        period: { startDate, endDate },
        standards,
        complianceData,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error generating compliance report:", error);
      throw error;
    }
  }

  // ISO 27001 - Information Security Audit
  async logSecurityEvent(eventData) {
    return this.log({
      ...eventData,
      severity: "high",
      action: `SECURITY_${eventData.action}`,
      outcome: eventData.outcome || "warning",
    });
  }

  // ISO 9001 - Quality Management Audit
  async logQualityEvent(eventData) {
    return this.log({
      ...eventData,
      action: `QUALITY_${eventData.action}`,
      severity: eventData.severity || "medium",
    });
  }

  // ISO 31000 - Risk Management Audit
  async logRiskEvent(eventData) {
    return this.log({
      ...eventData,
      action: `RISK_${eventData.action}`,
      severity: eventData.severity || "medium",
    });
  }
}

module.exports = AuditService;

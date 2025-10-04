<<<<<<< HEAD
const Controller = require("../Base/Controller")

class IndustryController extends Controller {
    constructor() {
        super();
    }
    async createUser() {
        try {
            this.res.send({
                status: true,
                statusCode: 200,
                message: 'Server is up & running',
                data: {}
            })
        } catch (e) {
            console.log("Error on health check:\n", e)
            this.res.send({
                status: false,
                statusCode: 500,
                message: 'Internal server error',
                data: null
            })
        }
    }

    async getProfile() {
        try {
            this.res.send({
                status: true,
                statusCode: 200,
                message: 'User Data',
                data: {}
            })
        } catch (e) {
            console.log("Error on health check:\n", e)
            this.res.send({
                status: false,
                statusCode: 500,
                message: 'Internal server error',
                data: null
            })
        }
    }
}

module.exports = IndustryController
=======
const Controller = require("../Base/Controller");
const Middleware = require("../../Services/Middleware");

const {
  IndustryProfile,
  Requirement,
  RFQ,
  Quote,
  PurchaseOrder,
  Payment,
  WorkflowActivity,
  ComplianceRecord,
} = require("./Schema");
const { UserSchema } = require("../Users/Schema");
const NotificationService = require("../../Services/NotificationService");
const AuditService = require("../../Services/AuditService");
const ComplianceService = require("../../Services/ComplianceService");
const DocumentService = require("../../Services/DocumentService");
const AnalyticsService = require("../../Services/AnalyticsService");
const _ = require("lodash");
const bcryptjs = require("bcryptjs");

class IndustryController extends Controller {
  constructor() {
    super();
    this.notificationService = new NotificationService();
    this.auditService = new AuditService();
    this.complianceService = new ComplianceService();
    this.documentService = new DocumentService();
    this.analyticsService = new AnalyticsService();
  }

  // Industry Profile Management
  async createIndustryProfile() {
    try {
      const profileData = this.req.body;

      // Check if company name already exists
      const existingProfile = await IndustryProfile.findOne({
        companyName: profileData.companyName.trim(),
      });

      if (existingProfile) {
        return this.res.status(400).send({
          status: false,
          message: "Company name already exists",
        });
      }

      const profile = new IndustryProfile(profileData);
      await profile.save();

      await this.auditService.log({
        userId: this.req.user?.id,
        action: "CREATE_INDUSTRY_PROFILE",
        resource: "IndustryProfile",
        resourceId: profile._id,
        changes: profileData,
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Industry profile created successfully",
        data: profile,
      });
    } catch (error) {
      console.error("Error creating industry profile:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async getIndustryProfile() {
    try {
      const { id } = this.req.params;
      const profile = await IndustryProfile.findById(id);

      if (!profile) {
        return this.res.status(404).send({
          status: false,
          message: "Industry profile not found",
        });
      }

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Industry profile retrieved successfully",
        data: profile,
      });
    } catch (error) {
      console.error("Error retrieving industry profile:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Requirements Management
  async createRequirement() {
    try {
      const requirementData = this.req.body;
      requirementData.industryId = this.req.user.profileId;

      const requirement = new Requirement(requirementData);
      await requirement.save();

      // Initialize approval workflow if defined
      if (requirementData.approvalWorkflow?.steps?.length > 0) {
        requirement.status = "pending_approval";
        await requirement.save();
      }

      await this.auditService.log({
        userId: this.req.user.id,
        action: "CREATE_REQUIREMENT",
        resource: "Requirement",
        resourceId: requirement._id,
        changes: requirementData,
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Requirement created successfully",
        data: requirement,
      });
    } catch (error) {
      console.error("Error creating requirement:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async getRequirements() {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        category,
        priority,
      } = this.req.query;
      const industryId = this.req.user.profileId;

      const filter = { industryId };
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (priority) filter.priority = priority;

      const requirements = await Requirement.find(filter)
        .populate("industryId", "companyName")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Requirement.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Requirements retrieved successfully",
        data: {
          requirements,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving requirements:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async approveRequirement() {
    try {
      const { id } = this.req.params;
      const { comments } = this.req.body;

      const requirement = await Requirement.findById(id);
      if (!requirement) {
        return this.res.status(404).send({
          status: false,
          message: "Requirement not found",
        });
      }

      // Update approval workflow
      const currentStep = requirement.approvalWorkflow.steps.find(
        (step) => step.status === "pending"
      );

      if (currentStep) {
        currentStep.status = "approved";
        currentStep.approvedBy = this.req.user.id;
        currentStep.approvedAt = new Date();
        currentStep.comments = comments;
      }

      // Check if all steps are approved
      const allApproved = requirement.approvalWorkflow.steps.every(
        (step) => step.status === "approved"
      );

      if (allApproved) {
        requirement.status = "approved";
      }

      await requirement.save();

      await this.auditService.log({
        userId: this.req.user.id,
        action: "APPROVE_REQUIREMENT",
        resource: "Requirement",
        resourceId: requirement._id,
        changes: { approved: true, comments },
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Requirement approved successfully",
        data: requirement,
      });
    } catch (error) {
      console.error("Error approving requirement:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async publishRequirement() {
    try {
      const { id } = this.req.params;
      const { stakeholderIds } = this.req.body;

      const requirement = await Requirement.findById(id);
      if (!requirement) {
        return this.res.status(404).send({
          status: false,
          message: "Requirement not found",
        });
      }

      if (requirement.status !== "approved") {
        return this.res.status(400).send({
          status: false,
          message: "Requirement must be approved before publishing",
        });
      }

      // Create RFQs for selected stakeholders
      const rfqs = [];
      for (const stakeholderId of stakeholderIds) {
        const rfq = new RFQ({
          requirementId: requirement._id,
          industryId: requirement.industryId,
          stakeholderId: stakeholderId.id,
          stakeholderType: stakeholderId.type,
          title: requirement.title,
          description: requirement.description,
          technicalSpecs: requirement.technicalSpecs,
          budget: requirement.budget,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        });

        await rfq.save();
        rfqs.push(rfq);

        // Send notification
        await this.notificationService.send({
          userId: stakeholderId.id,
          title: "New RFQ Received",
          message: `You have received a new RFQ: ${requirement.title}`,
          type: "rfq",
          relatedId: rfq._id,
          relatedType: "rfq",
        });
      }

      requirement.status = "published";
      requirement.publishedAt = new Date();
      requirement.rfqSentTo = stakeholderIds.map((s) => s.id);
      await requirement.save();

      await this.auditService.log({
        userId: this.req.user.id,
        action: "PUBLISH_REQUIREMENT",
        resource: "Requirement",
        resourceId: requirement._id,
        changes: { published: true, rfqCount: rfqs.length },
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Requirement published successfully",
        data: { requirement, rfqsSent: rfqs.length },
      });
    } catch (error) {
      console.error("Error publishing requirement:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // RFQ Management
  async getRFQs() {
    try {
      const { page = 1, limit = 10, status } = this.req.query;
      const industryId = this.req.user.profileId;

      const filter = { industryId };
      if (status) filter.status = status;

      const rfqs = await RFQ.find(filter)
        .populate("requirementId", "title category")
        .populate("stakeholderId", "companyName")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await RFQ.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "RFQs retrieved successfully",
        data: {
          rfqs,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving RFQs:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async getRFQResponses() {
    try {
      const { id } = this.req.params;

      const quotes = await Quote.find({ rfqId: id })
        .populate("stakeholderId", "companyName")
        .sort({ createdAt: -1 });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "RFQ responses retrieved successfully",
        data: quotes,
      });
    } catch (error) {
      console.error("Error retrieving RFQ responses:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Quote Management
  async getQuotes() {
    try {
      const { page = 1, limit = 10, status } = this.req.query;

      const rfqs = await RFQ.find({ industryId: this.req.user.profileId });
      const rfqIds = rfqs.map((rfq) => rfq._id);

      const filter = { rfqId: { $in: rfqIds } };
      if (status) filter.status = status;

      const quotes = await Quote.find(filter)
        .populate("rfqId", "title")
        .populate("stakeholderId", "companyName")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Quote.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Quotes retrieved successfully",
        data: {
          quotes,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving quotes:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async evaluateQuote() {
    try {
      const { id } = this.req.params;
      const { score, notes } = this.req.body;

      const quote = await Quote.findById(id);
      if (!quote)
        return this.res
          .status(404)
          .send({ status: false, message: "Quote not found" });

      quote.evaluationScore = score;
      quote.evaluationNotes = notes;
      quote.status = "under_review";
      quote.reviewedBy = this.req.user.id;
      quote.reviewedAt = new Date();
      await quote.save();

      await this.auditService.log({
        userId: this.req.user.id,
        action: "EVALUATE_QUOTE",
        resource: "Quote",
        resourceId: quote._id,
        changes: { score, notes },
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Quote evaluated successfully",
        data: quote,
      });
    } catch (error) {
      console.error("Error evaluating quote:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async acceptQuote() {
    try {
      const { id } = this.req.params;
      const quote = await Quote.findById(id)
        .populate("rfqId")
        .populate("stakeholderId");
      if (!quote)
        return this.res
          .status(404)
          .send({ status: false, message: "Quote not found" });

      quote.status = "accepted";
      await quote.save();

      const poNumber = `PO-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)
        .toUpperCase()}`;
      const purchaseOrder = new PurchaseOrder({
        poNumber,
        industryId: this.req.user.profileId,
        vendorId: quote.stakeholderId._id,
        requirementId: quote.rfqId.requirementId,
        quoteId: quote._id,
        projectTitle: quote.rfqId.title,
        orderValue: quote.pricing.totalAmount,
        totalValue: quote.pricing.totalAmount + (quote.pricing.taxes || 0),
        startDate: quote.timeline.estimatedStartDate,
        endDate: quote.timeline.estimatedEndDate,
        paymentTerms: "30 days",
        scopeOfWork: quote.technicalProposal,
        status: "draft",
      });

      await purchaseOrder.save();
      await this.notificationService.send({
        userId: quote.stakeholderId._id,
        title: "Quote Accepted",
        message: `Your quote for "${quote.rfqId.title}" has been accepted. PO: ${poNumber}`,
        type: "success",
        relatedId: purchaseOrder._id,
        relatedType: "purchaseOrder",
      });

      await this.auditService.log({
        userId: this.req.user.id,
        action: "ACCEPT_QUOTE",
        resource: "Quote",
        resourceId: quote._id,
        changes: { accepted: true, poNumber },
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Quote accepted and Purchase Order created",
        data: { quote, purchaseOrder },
      });
    } catch (error) {
      console.error("Error accepting quote:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async rejectQuote() {
    try {
      const { id } = this.req.params;
      const quote = await Quote.findByIdAndUpdate(
        id,
        { status: "rejected" },
        { new: true }
      );
      if (!quote)
        return this.res
          .status(404)
          .send({ status: false, message: "Quote not found" });

      await this.notificationService.send({
        userId: quote.stakeholderId,
        title: "Quote Rejected",
        message: `Your quote has been rejected.`,
        type: "warning",
        relatedId: quote._id,
        relatedType: "quote",
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Quote rejected",
        data: quote,
      });
    } catch (error) {
      console.error("Error rejecting quote:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async evaluateQuote() {
    try {
      const { id } = this.req.params;
      const { score, notes } = this.req.body;

      const quote = await Quote.findById(id);
      if (!quote) {
        return this.res.status(404).send({
          status: false,
          message: "Quote not found",
        });
      }

      quote.evaluationScore = score;
      quote.evaluationNotes = notes;
      quote.status = "under_review";
      quote.reviewedBy = this.req.user.id;
      quote.reviewedAt = new Date();

      await quote.save();

      await this.auditService.log({
        userId: this.req.user.id,
        action: "EVALUATE_QUOTE",
        resource: "Quote",
        resourceId: quote._id,
        changes: { score, notes },
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Quote evaluated successfully",
        data: quote,
      });
    } catch (error) {
      console.error("Error evaluating quote:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async acceptQuote() {
    try {
      const { id } = this.req.params;

      const quote = await Quote.findById(id)
        .populate("rfqId")
        .populate("stakeholderId");

      if (!quote) {
        return this.res.status(404).send({
          status: false,
          message: "Quote not found",
        });
      }

      quote.status = "accepted";
      await quote.save();

      // Generate PO number
      const poNumber = `PO-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)
        .toUpperCase()}`;

      // Create Purchase Order
      const purchaseOrder = new PurchaseOrder({
        poNumber,
        industryId: this.req.user.profileId,
        vendorId: quote.stakeholderId._id,
        requirementId: quote.rfqId.requirementId,
        quoteId: quote._id,
        projectTitle: quote.rfqId.title,
        orderValue: quote.pricing.totalAmount,
        totalValue: quote.pricing.totalAmount + (quote.pricing.taxes || 0),
        startDate: quote.timeline.estimatedStartDate,
        endDate: quote.timeline.estimatedEndDate,
        paymentTerms: "30 days",
        scopeOfWork: quote.technicalProposal,
        status: "draft",
      });

      await purchaseOrder.save();

      // Send notification to vendor
      await this.notificationService.send({
        userId: quote.stakeholderId._id,
        title: "Quote Accepted",
        message: `Your quote for "${quote.rfqId.title}" has been accepted. PO: ${poNumber}`,
        type: "success",
        relatedId: purchaseOrder._id,
        relatedType: "purchaseOrder",
      });

      await this.auditService.log({
        userId: this.req.user.id,
        action: "ACCEPT_QUOTE",
        resource: "Quote",
        resourceId: quote._id,
        changes: { accepted: true, poNumber },
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Quote accepted and Purchase Order created",
        data: { quote, purchaseOrder },
      });
    } catch (error) {
      console.error("Error accepting quote:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Purchase Order Management
  async getPurchaseOrders() {
    try {
      const { page = 1, limit = 10, status } = this.req.query;
      const industryId = this.req.user.profileId;

      const filter = { industryId };
      if (status) filter.status = status;

      const purchaseOrders = await PurchaseOrder.find(filter)
        .populate("vendorId", "companyName")
        .populate("requirementId", "title")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await PurchaseOrder.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Purchase Orders retrieved successfully",
        data: {
          purchaseOrders,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving purchase orders:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async approvePurchaseOrder() {
    try {
      const { id } = this.req.params;
      const { comments } = this.req.body;

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return this.res.status(404).send({
          status: false,
          message: "Purchase Order not found",
        });
      }

      purchaseOrder.approvals.push({
        approverRole: this.req.user.role,
        approvedBy: this.req.user.id,
        approvedAt: new Date(),
        status: "approved",
        comments,
      });

      purchaseOrder.status = "issued";
      await purchaseOrder.save();

      await this.auditService.log({
        userId: this.req.user.id,
        action: "APPROVE_PURCHASE_ORDER",
        resource: "PurchaseOrder",
        resourceId: purchaseOrder._id,
        changes: { approved: true, comments },
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Purchase Order approved successfully",
        data: purchaseOrder,
      });
    } catch (error) {
      console.error("Error approving purchase order:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async deliverPurchaseOrder() {
    try {
      const { id } = this.req.params;
      const po = await PurchaseOrder.findByIdAndUpdate(
        id,
        { status: "delivered" },
        { new: true }
      );
      if (!po)
        return this.res
          .status(404)
          .send({ status: false, message: "Purchase Order not found" });

      await this.notificationService.send({
        userId: po.vendorId,
        title: "Purchase Order Delivered",
        message: `Your Purchase Order ${po.poNumber} has been marked as delivered.`,
        type: "success",
        relatedId: po._id,
        relatedType: "purchaseOrder",
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Purchase Order delivered",
        data: po,
      });
    } catch (error) {
      console.error("Error delivering purchase order:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Inside IndustryController class

  async createPurchaseOrder() {
    try {
      const poData = this.req.body;

      // Basic validation
      if (!poData.vendorId || !poData.requirementId || !poData.orderValue) {
        return this.res.status(400).send({
          status: false,
          message: "vendorId, requirementId, and orderValue are required",
        });
      }

      const poNumber = `PO-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 5)
        .toUpperCase()}`;

      const purchaseOrder = new PurchaseOrder({
        poNumber,
        industryId: this.req.user.profileId,
        vendorId: poData.vendorId,
        requirementId: poData.requirementId,
        projectTitle: poData.projectTitle || "",
        orderValue: poData.orderValue,
        totalValue: poData.totalValue || poData.orderValue,
        startDate: poData.startDate,
        endDate: poData.endDate,
        paymentTerms: poData.paymentTerms || "30 days",
        scopeOfWork: poData.scopeOfWork || "",
        status: "draft",
      });

      await purchaseOrder.save();

      // Notify vendor
      await this.notificationService.send({
        userId: poData.vendorId,
        title: "New Purchase Order Created",
        message: `A new Purchase Order ${poNumber} has been created for you.`,
        type: "success",
        relatedId: purchaseOrder._id,
        relatedType: "purchaseOrder",
      });

      await this.auditService.log({
        userId: this.req.user.id,
        action: "CREATE_PURCHASE_ORDER",
        resource: "PurchaseOrder",
        resourceId: purchaseOrder._id,
        changes: poData,
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Purchase Order created successfully",
        data: purchaseOrder,
      });
    } catch (error) {
      console.error("Error creating purchase order:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Workflow Management
  async getWorkflows() {
    try {
      const { page = 1, limit = 10 } = this.req.query;
      const industryId = this.req.user.profileId;

      const purchaseOrders = await PurchaseOrder.find({
        industryId,
        status: { $in: ["issued", "in_progress"] },
      })
        .populate("vendorId", "companyName")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await PurchaseOrder.countDocuments({
        industryId,
        status: { $in: ["issued", "in_progress"] },
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Active workflows retrieved successfully",
        data: {
          workflows: purchaseOrders,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving workflows:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async getWorkflowTimeline() {
    try {
      const { id } = this.req.params;

      const activities = await WorkflowActivity.find({ purchaseOrderId: id })
        .populate("performedBy", "email")
        .sort({ timestamp: -1 });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Workflow timeline retrieved successfully",
        data: activities,
      });
    } catch (error) {
      console.error("Error retrieving workflow timeline:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Compliance Management
  async getComplianceRecords() {
    try {
      const { page = 1, limit = 10, entityType, standard } = this.req.query;

      const filter = {};
      if (entityType) filter.entityType = entityType;
      if (standard) filter.standard = standard;

      const records = await ComplianceRecord.find(filter)
        .populate("assessedBy", "email")
        .sort({ assessmentDate: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await ComplianceRecord.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Compliance records retrieved successfully",
        data: {
          records,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving compliance records:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async createComplianceAssessment() {
    try {
      const assessmentData = this.req.body;
      assessmentData.assessedBy = this.req.user.id;
      assessmentData.assessmentDate = new Date();

      const record = new ComplianceRecord(assessmentData);
      await record.save();

      await this.auditService.log({
        userId: this.req.user.id,
        action: "CREATE_COMPLIANCE_ASSESSMENT",
        resource: "ComplianceRecord",
        resourceId: record._id,
        changes: assessmentData,
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Compliance assessment created successfully",
        data: record,
      });
    } catch (error) {
      console.error("Error creating compliance assessment:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Analytics and Reporting
  async getDashboardAnalytics() {
    try {
      const industryId = this.req.user.profileId;
      const { startDate, endDate } = this.req.query;

      const analytics = await this.analyticsService.getDashboardMetrics(
        industryId,
        { startDate, endDate }
      );

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Dashboard analytics retrieved successfully",
        data: analytics,
      });
    } catch (error) {
      console.error("Error retrieving dashboard analytics:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async getPerformanceAnalytics() {
    try {
      const industryId = this.req.user.profileId;
      const { startDate, endDate } = this.req.query;

      const performance = await this.analyticsService.getVendorPerformance(
        industryId,
        { startDate, endDate }
      );

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Performance analytics retrieved successfully",
        data: performance,
      });
    } catch (error) {
      console.error("Error retrieving performance analytics:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Inside IndustryController class

  // Payment Management
  async getPayments() {
    try {
      const { page = 1, limit = 10, status } = this.req.query;
      const industryId = this.req.user.profileId;

      const filter = { industryId };
      if (status) filter.status = status;

      const payments = await Payment.find(filter)
        .populate("vendorId", "companyName")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Payment.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Payments retrieved successfully",
        data: {
          payments,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      });
    } catch (error) {
      console.error("Error retrieving payments:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async processPayment() {
    try {
      const { id } = this.req.params;
      const { amount, method, notes } = this.req.body;

      const payment = await Payment.findById(id);
      if (!payment) {
        return this.res.status(404).send({
          status: false,
          message: "Payment not found",
        });
      }

      payment.amountPaid = amount;
      payment.paymentMethod = method;
      payment.notes = notes;
      payment.status = "processed";
      payment.processedAt = new Date();
      payment.processedBy = this.req.user.id;

      await payment.save();

      await this.notificationService.send({
        userId: payment.vendorId,
        title: "Payment Processed",
        message: `Payment of ₹${amount} has been processed for your order.`,
        type: "success",
        relatedId: payment._id,
        relatedType: "payment",
      });

      await this.auditService.log({
        userId: this.req.user.id,
        action: "PROCESS_PAYMENT",
        resource: "Payment",
        resourceId: payment._id,
        changes: { amount, method, notes },
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Payment processed successfully",
        data: payment,
      });
    } catch (error) {
      console.error("Error processing payment:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async getPaymentStatus() {
    try {
      const { id } = this.req.params;
      const payment = await Payment.findById(id).populate(
        "vendorId",
        "companyName"
      );
      if (!payment) {
        return this.res.status(404).send({
          status: false,
          message: "Payment not found",
        });
      }

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Payment status retrieved successfully",
        data: payment,
      });
    } catch (error) {
      console.error("Error retrieving payment status:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async approvePayment() {
    try {
      const { id } = this.req.params;
      const payment = await Payment.findById(id);
      if (!payment) {
        return this.res.status(404).send({
          status: false,
          message: "Payment not found",
        });
      }

      payment.status = "approved";
      payment.approvedBy = this.req.user.id;
      payment.approvedAt = new Date();

      await payment.save();

      await this.notificationService.send({
        userId: payment.vendorId,
        title: "Payment Approved",
        message: `Payment of ₹${payment.amountPaid} has been approved.`,
        type: "success",
        relatedId: payment._id,
        relatedType: "payment",
      });

      await this.auditService.log({
        userId: this.req.user.id,
        action: "APPROVE_PAYMENT",
        resource: "Payment",
        resourceId: payment._id,
        changes: { approved: true },
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Payment approved successfully",
        data: payment,
      });
    } catch (error) {
      console.error("Error approving payment:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async getPaymentReports() {
    try {
      const industryId = this.req.user.profileId;
      const payments = await Payment.find({ industryId });

      // Simple aggregation example
      const totalPayments = payments.reduce(
        (acc, p) => acc + (p.amountPaid || 0),
        0
      );
      const pendingPayments = payments.filter(
        (p) => p.status !== "approved"
      ).length;
      const approvedPayments = payments.filter(
        (p) => p.status === "approved"
      ).length;

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Payment reports retrieved successfully",
        data: {
          totalPayments,
          approvedPayments,
          pendingPayments,
          payments,
        },
      });
    } catch (error) {
      console.error("Error retrieving payment reports:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async getSpendingAnalytics() {
    try {
      const industryId = this.req.user.profileId;
      const { startDate, endDate } = this.req.query;

      const spending = await this.analyticsService.getSpendingAnalysis(
        industryId,
        { startDate, endDate }
      );

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Spending analytics retrieved successfully",
        data: spending,
      });
    } catch (error) {
      console.error("Error retrieving spending analytics:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  // Document Management Implementation
  async uploadDocument() {
    try {
      // This would typically handle file upload via multer middleware
      // For now, we'll simulate the document upload process
      const { entityId, entityType, category, name } = this.req.body;

      // Simulate file data
      const fileData = {
        buffer: Buffer.from("sample document content"),
        originalName: name || "document.pdf",
        mimeType: "application/pdf",
        size: 1024,
      };

      const metadata = {
        entityId,
        entityType,
        category,
        uploadedBy: this.req.user.id,
      };

      const document = await this.documentService.uploadDocument(
        fileData,
        metadata
      );

      await this.auditService.log({
        userId: this.req.user.id,
        action: "UPLOAD_DOCUMENT",
        resource: "Document",
        resourceId: document._id,
        changes: { name: document.originalName, entityType, entityId },
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Document uploaded successfully",
        data: document,
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async getDocuments() {
    try {
      const { page = 1, limit = 20, entityType, entityId } = this.req.query;

      const filter = {};
      if (entityType) filter.entityType = entityType;
      if (entityId) filter.entityId = entityId;

      const result = await this.documentService.getDocuments(filter, {
        page,
        limit,
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Documents retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error retrieving documents:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async downloadDocument() {
    try {
      const { id } = this.req.params;

      const document = await this.documentService.getDocument(id);

      if (!document) {
        return this.res.status(404).send({
          status: false,
          message: "Document not found",
        });
      }

      // In a real implementation, this would stream the file
      this.res.send({
        status: true,
        statusCode: 200,
        message: "Document retrieved successfully",
        data: {
          ...document.toObject(),
          downloadUrl: document.url,
        },
      });
    } catch (error) {
      console.error("Error downloading document:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async deleteDocument() {
    try {
      const { id } = this.req.params;

      const document = await this.documentService.deleteDocument(
        id,
        this.req.user.id
      );

      await this.auditService.log({
        userId: this.req.user.id,
        action: "DELETE_DOCUMENT",
        resource: "Document",
        resourceId: document._id,
        changes: { deleted: true },
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: "Document deleted successfully",
        data: null,
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async createDocumentVersion() {
    try {
      const { id } = this.req.params;
      const { name } = this.req.body;

      // Simulate file data for new version
      const fileData = {
        buffer: Buffer.from("updated document content"),
        originalName: name || "document_v2.pdf",
        mimeType: "application/pdf",
        size: 1024,
      };

      const metadata = {
        uploadedBy: this.req.user.id,
      };

      const newVersion = await this.documentService.createDocumentVersion(
        id,
        fileData,
        metadata
      );

      await this.auditService.log({
        userId: this.req.user.id,
        action: "CREATE_DOCUMENT_VERSION",
        resource: "Document",
        resourceId: newVersion._id,
        changes: { parentDocumentId: id, version: newVersion.version },
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: "Document version created successfully",
        data: newVersion,
      });
    } catch (error) {
      console.error("Error creating document version:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }
}

module.exports = IndustryController;
>>>>>>> 30ed529 (Initial commit)

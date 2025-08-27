const Controller = require("../Base/Controller");
const Middleware = require("../../Services/Middleware");
const { 
  IndustryProfile, 
  Requirement, 
  RFQ, 
  Quote, 
  PurchaseOrder, 
  WorkflowActivity,
  ComplianceRecord 
} = require('./Schema');
const { UserSchema } = require('../Users/Schema');
const NotificationService = require('../../Services/NotificationService');
const AuditService = require('../../Services/AuditService');
const ComplianceService = require('../../Services/ComplianceService');
const _ = require("lodash");
const bcrypt = require('bcryptjs');

class IndustryController extends Controller {
  constructor() {
    super();
    this.notificationService = new NotificationService();
    this.auditService = new AuditService();
    this.complianceService = new ComplianceService();
  }

  // Industry Profile Management
  async createIndustryProfile() {
    try {
      const profileData = this.req.body;
      
      // Check if company name already exists
      const existingProfile = await IndustryProfile.findOne({ 
        companyName: profileData.companyName.trim() 
      });
      
      if (existingProfile) {
        return this.res.status(400).send({
          status: false,
          message: 'Company name already exists'
        });
      }

      const profile = new IndustryProfile(profileData);
      await profile.save();

      await this.auditService.log({
        userId: this.req.user?.id,
        action: 'CREATE_INDUSTRY_PROFILE',
        resource: 'IndustryProfile',
        resourceId: profile._id,
        changes: profileData
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: 'Industry profile created successfully',
        data: profile
      });
    } catch (error) {
      console.error("Error creating industry profile:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
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
          message: 'Industry profile not found'
        });
      }

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Industry profile retrieved successfully',
        data: profile
      });
    } catch (error) {
      console.error("Error retrieving industry profile:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
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
        requirement.status = 'pending_approval';
        await requirement.save();
      }

      await this.auditService.log({
        userId: this.req.user.id,
        action: 'CREATE_REQUIREMENT',
        resource: 'Requirement',
        resourceId: requirement._id,
        changes: requirementData
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: 'Requirement created successfully',
        data: requirement
      });
    } catch (error) {
      console.error("Error creating requirement:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async getRequirements() {
    try {
      const { page = 1, limit = 10, status, category, priority } = this.req.query;
      const industryId = this.req.user.profileId;

      const filter = { industryId };
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (priority) filter.priority = priority;

      const requirements = await Requirement.find(filter)
        .populate('industryId', 'companyName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Requirement.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Requirements retrieved successfully',
        data: {
          requirements,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      console.error("Error retrieving requirements:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
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
          message: 'Requirement not found'
        });
      }

      // Update approval workflow
      const currentStep = requirement.approvalWorkflow.steps.find(
        step => step.status === 'pending'
      );

      if (currentStep) {
        currentStep.status = 'approved';
        currentStep.approvedBy = this.req.user.id;
        currentStep.approvedAt = new Date();
        currentStep.comments = comments;
      }

      // Check if all steps are approved
      const allApproved = requirement.approvalWorkflow.steps.every(
        step => step.status === 'approved'
      );

      if (allApproved) {
        requirement.status = 'approved';
      }

      await requirement.save();

      await this.auditService.log({
        userId: this.req.user.id,
        action: 'APPROVE_REQUIREMENT',
        resource: 'Requirement',
        resourceId: requirement._id,
        changes: { approved: true, comments }
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Requirement approved successfully',
        data: requirement
      });
    } catch (error) {
      console.error("Error approving requirement:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
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
          message: 'Requirement not found'
        });
      }

      if (requirement.status !== 'approved') {
        return this.res.status(400).send({
          status: false,
          message: 'Requirement must be approved before publishing'
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
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
        });
        
        await rfq.save();
        rfqs.push(rfq);

        // Send notification
        await this.notificationService.send({
          userId: stakeholderId.id,
          title: 'New RFQ Received',
          message: `You have received a new RFQ: ${requirement.title}`,
          type: 'rfq',
          relatedId: rfq._id,
          relatedType: 'rfq'
        });
      }

      requirement.status = 'published';
      requirement.publishedAt = new Date();
      requirement.rfqSentTo = stakeholderIds.map(s => s.id);
      await requirement.save();

      await this.auditService.log({
        userId: this.req.user.id,
        action: 'PUBLISH_REQUIREMENT',
        resource: 'Requirement',
        resourceId: requirement._id,
        changes: { published: true, rfqCount: rfqs.length }
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Requirement published successfully',
        data: { requirement, rfqsSent: rfqs.length }
      });
    } catch (error) {
      console.error("Error publishing requirement:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
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
        .populate('requirementId', 'title category')
        .populate('stakeholderId', 'companyName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await RFQ.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'RFQs retrieved successfully',
        data: {
          rfqs,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      console.error("Error retrieving RFQs:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async getRFQResponses() {
    try {
      const { id } = this.req.params;
      
      const quotes = await Quote.find({ rfqId: id })
        .populate('stakeholderId', 'companyName')
        .sort({ createdAt: -1 });

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'RFQ responses retrieved successfully',
        data: quotes
      });
    } catch (error) {
      console.error("Error retrieving RFQ responses:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
      });
    }
  }

  // Quote Management
  async getQuotes() {
    try {
      const { page = 1, limit = 10, status } = this.req.query;
      
      const rfqs = await RFQ.find({ industryId: this.req.user.profileId });
      const rfqIds = rfqs.map(rfq => rfq._id);

      const filter = { rfqId: { $in: rfqIds } };
      if (status) filter.status = status;

      const quotes = await Quote.find(filter)
        .populate('rfqId', 'title')
        .populate('stakeholderId', 'companyName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Quote.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Quotes retrieved successfully',
        data: {
          quotes,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      console.error("Error retrieving quotes:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
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
          message: 'Quote not found'
        });
      }

      quote.evaluationScore = score;
      quote.evaluationNotes = notes;
      quote.status = 'under_review';
      quote.reviewedBy = this.req.user.id;
      quote.reviewedAt = new Date();

      await quote.save();

      await this.auditService.log({
        userId: this.req.user.id,
        action: 'EVALUATE_QUOTE',
        resource: 'Quote',
        resourceId: quote._id,
        changes: { score, notes }
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Quote evaluated successfully',
        data: quote
      });
    } catch (error) {
      console.error("Error evaluating quote:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async acceptQuote() {
    try {
      const { id } = this.req.params;

      const quote = await Quote.findById(id)
        .populate('rfqId')
        .populate('stakeholderId');

      if (!quote) {
        return this.res.status(404).send({
          status: false,
          message: 'Quote not found'
        });
      }

      quote.status = 'accepted';
      await quote.save();

      // Generate PO number
      const poNumber = `PO-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

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
        paymentTerms: '30 days',
        scopeOfWork: quote.technicalProposal,
        status: 'draft'
      });

      await purchaseOrder.save();

      // Send notification to vendor
      await this.notificationService.send({
        userId: quote.stakeholderId._id,
        title: 'Quote Accepted',
        message: `Your quote for "${quote.rfqId.title}" has been accepted. PO: ${poNumber}`,
        type: 'success',
        relatedId: purchaseOrder._id,
        relatedType: 'purchaseOrder'
      });

      await this.auditService.log({
        userId: this.req.user.id,
        action: 'ACCEPT_QUOTE',
        resource: 'Quote',
        resourceId: quote._id,
        changes: { accepted: true, poNumber }
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Quote accepted and Purchase Order created',
        data: { quote, purchaseOrder }
      });
    } catch (error) {
      console.error("Error accepting quote:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
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
        .populate('vendorId', 'companyName')
        .populate('requirementId', 'title')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await PurchaseOrder.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Purchase Orders retrieved successfully',
        data: {
          purchaseOrders,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      console.error("Error retrieving purchase orders:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
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
          message: 'Purchase Order not found'
        });
      }

      purchaseOrder.approvals.push({
        approverRole: this.req.user.role,
        approvedBy: this.req.user.id,
        approvedAt: new Date(),
        status: 'approved',
        comments
      });

      purchaseOrder.status = 'issued';
      await purchaseOrder.save();

      await this.auditService.log({
        userId: this.req.user.id,
        action: 'APPROVE_PURCHASE_ORDER',
        resource: 'PurchaseOrder',
        resourceId: purchaseOrder._id,
        changes: { approved: true, comments }
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Purchase Order approved successfully',
        data: purchaseOrder
      });
    } catch (error) {
      console.error("Error approving purchase order:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
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
        status: { $in: ['issued', 'in_progress'] }
      })
        .populate('vendorId', 'companyName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await PurchaseOrder.countDocuments({ 
        industryId,
        status: { $in: ['issued', 'in_progress'] }
      });

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Active workflows retrieved successfully',
        data: {
          workflows: purchaseOrders,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      console.error("Error retrieving workflows:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
      });
    }
  }

  async getWorkflowTimeline() {
    try {
      const { id } = this.req.params;

      const activities = await WorkflowActivity.find({ purchaseOrderId: id })
        .populate('performedBy', 'email')
        .sort({ timestamp: -1 });

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Workflow timeline retrieved successfully',
        data: activities
      });
    } catch (error) {
      console.error("Error retrieving workflow timeline:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
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
        .populate('assessedBy', 'email')
        .sort({ assessmentDate: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await ComplianceRecord.countDocuments(filter);

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Compliance records retrieved successfully',
        data: {
          records,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      console.error("Error retrieving compliance records:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
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
        action: 'CREATE_COMPLIANCE_ASSESSMENT',
        resource: 'ComplianceRecord',
        resourceId: record._id,
        changes: assessmentData
      });

      this.res.send({
        status: true,
        statusCode: 201,
        message: 'Compliance assessment created successfully',
        data: record
      });
    } catch (error) {
      console.error("Error creating compliance assessment:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
      });
    }
  }

  // Analytics and Reporting
  async getDashboardAnalytics() {
    try {
      const industryId = this.req.user.profileId;

      const [
        totalRequirements,
        activeRFQs,
        pendingQuotes,
        activePOs,
        complianceScore
      ] = await Promise.all([
        Requirement.countDocuments({ industryId }),
        RFQ.countDocuments({ industryId, status: { $in: ['sent', 'viewed'] } }),
        Quote.countDocuments({ status: 'submitted' }),
        PurchaseOrder.countDocuments({ industryId, status: { $in: ['issued', 'in_progress'] } }),
        this.complianceService.calculateOverallScore(industryId)
      ]);

      const analytics = {
        totalRequirements,
        activeRFQs,
        pendingQuotes,
        activePOs,
        complianceScore: complianceScore || 0
      };

      this.res.send({
        status: true,
        statusCode: 200,
        message: 'Dashboard analytics retrieved successfully',
        data: analytics
      });
    } catch (error) {
      console.error("Error retrieving dashboard analytics:", error);
      this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: 'Internal server error',
        data: null
      });
    }
  }
}

module.exports = IndustryController;
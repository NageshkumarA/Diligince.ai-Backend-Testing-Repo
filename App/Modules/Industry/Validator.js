const Joi = require("joi");

class IndustryValidators {
    
    static validateIndustryProfile() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    companyName: Joi.string().trim().required().min(2).max(100),
                    industryType: Joi.string().valid(
                        'Power Generation', 'Manufacturing', 'IT Services', 
                        'Construction', 'Healthcare', 'Finance', 'Other'
                    ).required(),
                    companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-1000', '1000+').optional(),
                    annualRevenue: Joi.string().optional(),
                    headquartersLocation: Joi.string().optional(),
                    operatingRegions: Joi.array().items(Joi.string()).optional(),
                    complianceCertifications: Joi.array().items(Joi.string()).optional(),
                    contactInfo: Joi.object({
                        primaryContact: Joi.string().optional(),
                        phone: Joi.string().optional(),
                        address: Joi.string().optional(),
                        website: Joi.string().uri().optional()
                    }).optional(),
                    approvalMatrix: Joi.object({
                        roles: Joi.array().items(Joi.object({
                            roleName: Joi.string().required(),
                            approvalLimit: Joi.number().min(0).required(),
                            permissions: Joi.array().items(Joi.string()).required()
                        })).optional(),
                        workflows: Joi.array().items(Joi.object({
                            workflowType: Joi.string().required(),
                            steps: Joi.array().items(Joi.object({
                                stepName: Joi.string().required(),
                                approverRole: Joi.string().required(),
                                isRequired: Joi.boolean().default(true)
                            })).required()
                        })).optional()
                    }).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateRequirement() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    title: Joi.string().trim().required().min(5).max(200),
                    description: Joi.string().trim().required().min(10).max(2000),
                    category: Joi.string().trim().required(),
                    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
                    budget: Joi.object({
                        min: Joi.number().min(0).optional(),
                        max: Joi.number().min(0).optional(),
                        currency: Joi.string().length(3).default('USD')
                    }).optional(),
                    timeline: Joi.object({
                        startDate: Joi.date().iso().optional(),
                        endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
                        milestones: Joi.array().items(Joi.object({
                            name: Joi.string().required(),
                            date: Joi.date().iso().required(),
                            description: Joi.string().optional()
                        })).optional()
                    }).optional(),
                    technicalSpecs: Joi.object().optional(),
                    complianceRequirements: Joi.array().items(Joi.string()).optional(),
                    deliverables: Joi.array().items(Joi.object({
                        name: Joi.string().required(),
                        description: Joi.string().required(),
                        dueDate: Joi.date().iso().optional()
                    })).optional(),
                    evaluationCriteria: Joi.array().items(Joi.object({
                        criterion: Joi.string().required(),
                        weight: Joi.number().min(0).max(100).required(),
                        description: Joi.string().optional()
                    })).optional(),
                    approvalWorkflow: Joi.object({
                        steps: Joi.array().items(Joi.object({
                            stepName: Joi.string().required(),
                            approverRole: Joi.string().required()
                        })).optional()
                    }).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validatePublishRequirement() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    stakeholderIds: Joi.array().items(Joi.object({
                        id: Joi.string().required(),
                        type: Joi.string().valid('vendor', 'professional').required()
                    })).min(1).required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateRFQ() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    requirementId: Joi.string().required(),
                    stakeholderId: Joi.string().required(),
                    stakeholderType: Joi.string().valid('vendor', 'professional').required(),
                    title: Joi.string().trim().required().min(5).max(200),
                    description: Joi.string().trim().required().min(10).max(2000),
                    deliveryTimeline: Joi.string().optional(),
                    termsAndConditions: Joi.string().optional(),
                    technicalSpecs: Joi.object().optional(),
                    budget: Joi.object({
                        min: Joi.number().min(0).optional(),
                        max: Joi.number().min(0).optional(),
                        currency: Joi.string().length(3).default('USD')
                    }).optional(),
                    dueDate: Joi.date().iso().min('now').required(),
                    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
                    attachments: Joi.array().items(Joi.object({
                        name: Joi.string().required(),
                        url: Joi.string().uri().required(),
                        type: Joi.string().required()
                    })).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateQuoteEvaluation() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    score: Joi.number().min(0).max(100).required(),
                    notes: Joi.string().trim().max(1000).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateQuoteRejection() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    reason: Joi.string().trim().required().min(10).max(500),
                    feedback: Joi.string().trim().max(1000).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validatePurchaseOrder() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    vendorId: Joi.string().required(),
                    requirementId: Joi.string().optional(),
                    quoteId: Joi.string().optional(),
                    projectTitle: Joi.string().trim().required().min(5).max(200),
                    orderValue: Joi.number().min(0).required(),
                    taxPercentage: Joi.number().min(0).max(100).default(0),
                    startDate: Joi.date().iso().min('now').required(),
                    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
                    paymentTerms: Joi.string().trim().required(),
                    specialInstructions: Joi.string().trim().max(1000).optional(),
                    scopeOfWork: Joi.string().trim().required().min(10).max(5000),
                    deliverables: Joi.array().items(Joi.object({
                        description: Joi.string().required(),
                        dueDate: Joi.date().iso().optional()
                    })).optional(),
                    paymentMilestones: Joi.array().items(Joi.object({
                        description: Joi.string().required(),
                        percentage: Joi.number().min(0).max(100).required(),
                        dueDate: Joi.date().iso().required()
                    })).optional(),
                    acceptanceCriteria: Joi.array().items(Joi.object({
                        criteria: Joi.string().required()
                    })).optional(),
                    isoTerms: Joi.array().items(Joi.string()).optional(),
                    customTerms: Joi.string().trim().max(2000).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateWorkflowUpdate() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    status: Joi.string().valid('pending', 'in_progress', 'completed').required(),
                    notes: Joi.string().trim().max(1000).optional(),
                    attachments: Joi.array().items(Joi.object({
                        name: Joi.string().required(),
                        url: Joi.string().uri().required(),
                        type: Joi.string().required()
                    })).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateMilestoneUpdate() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    milestones: Joi.array().items(Joi.object({
                        id: Joi.string().required(),
                        status: Joi.string().valid('pending', 'in_progress', 'completed').required(),
                        completedDate: Joi.date().iso().optional(),
                        notes: Joi.string().trim().max(500).optional()
                    })).min(1).required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validatePaymentProcessing() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    milestoneId: Joi.string().required(),
                    amount: Joi.number().min(0).required(),
                    paymentMethod: Joi.string().valid('bank_transfer', 'check', 'wire', 'ach').required(),
                    reference: Joi.string().trim().optional(),
                    notes: Joi.string().trim().max(500).optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }

    static validateComplianceAssessment() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    entityId: Joi.string().required(),
                    entityType: Joi.string().valid('requirement', 'purchaseOrder', 'vendor', 'industry').required(),
                    standard: Joi.string().trim().required(),
                    version: Joi.string().trim().optional(),
                    score: Joi.number().min(0).optional(),
                    maxScore: Joi.number().min(0).optional(),
                    status: Joi.string().valid('compliant', 'non_compliant', 'partially_compliant').required(),
                    findings: Joi.array().items(Joi.object({
                        category: Joi.string().required(),
                        description: Joi.string().required(),
                        severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
                        recommendation: Joi.string().optional()
                    })).optional(),
                    remediation: Joi.array().items(Joi.object({
                        action: Joi.string().required(),
                        assignedTo: Joi.string().optional(),
                        dueDate: Joi.date().iso().optional()
                    })).optional(),
                    nextAssessmentDate: Joi.date().iso().min('now').optional()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }
}

module.exports = IndustryValidators;
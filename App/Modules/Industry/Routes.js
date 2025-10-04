<<<<<<< HEAD
const IndustryController = require('./Controller')
=======
const IndustryController = require('./Controller');
>>>>>>> 30ed529 (Initial commit)

module.exports = (app, express) => {
    const router = express.Router();
    const Middleware = require("../../Services/Middleware");
    const Validators = require("./Validator");
<<<<<<< HEAD
    const config = require('../../../Configs/Config')

    router.post('/user/create-user1211', (req,res)=>{
        const userController = new IndustryController().boot(req,res)
        return userController.createUser();
    });

    router.get('/user/get-profile1211', 
        Middleware.isUserAuthorized, 
        (req,res,next)=>{
        const userController = new IndustryController().boot(req,res)
        return userController.getProfile();
    });

    app.use(config.baseApiUrl, router);
}
=======
    const config = require('../../../Configs/Config');

    // Industry Profile Management
    router.post('/industry/profile', 
        Middleware.isUserAuthorized,
        Validators.validateIndustryProfile(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.createIndustryProfile();
        }
    );

    router.get('/industry/profile/:id', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getIndustryProfile();
        }
    );

    // Requirements Management
    router.post('/industry/requirements', 
        Middleware.isUserAuthorized,
        Validators.validateRequirement(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.createRequirement();
        }
    );

    router.get('/industry/requirements', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getRequirements();
        }
    );

    router.get('/industry/requirements/:id', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getRequirement();
        }
    );

    router.put('/industry/requirements/:id', 
        Middleware.isUserAuthorized,
        Validators.validateRequirement(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.updateRequirement();
        }
    );

    router.post('/industry/requirements/:id/approve', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.approveRequirement();
        }
    );

    router.post('/industry/requirements/:id/publish', 
        Middleware.isUserAuthorized,
        Validators.validatePublishRequirement(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.publishRequirement();
        }
    );

    // RFQ Management
    router.post('/industry/rfqs', 
        Middleware.isUserAuthorized,
        Validators.validateRFQ(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.createRFQ();
        }
    );

    router.get('/industry/rfqs', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getRFQs();
        }
    );

    router.get('/industry/rfqs/:id', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getRFQ();
        }
    );

    router.get('/industry/rfqs/:id/responses', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getRFQResponses();
        }
    );

    // Quote Management
    router.get('/industry/quotes', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getQuotes();
        }
    );

    router.get('/industry/quotes/:id', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getQuote();
        }
    );

    router.post('/industry/quotes/:id/evaluate', 
        Middleware.isUserAuthorized,
        Validators.validateQuoteEvaluation(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.evaluateQuote();
        }
    );

    router.post('/industry/quotes/:id/accept', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.acceptQuote();
        }
    );

    router.post('/industry/quotes/:id/reject', 
        Middleware.isUserAuthorized,
        Validators.validateQuoteRejection(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.rejectQuote();
        }
    );

    router.get('/industry/quotes/analysis', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getQuoteAnalysis();
        }
    );

    // Purchase Order Management
    router.post('/industry/purchase-orders', 
        Middleware.isUserAuthorized,
        Validators.validatePurchaseOrder(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.createPurchaseOrder();
        }
    );

    router.get('/industry/purchase-orders', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getPurchaseOrders();
        }
    );

    router.get('/industry/purchase-orders/:id', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getPurchaseOrder();
        }
    );

    router.put('/industry/purchase-orders/:id', 
        Middleware.isUserAuthorized,
        Validators.validatePurchaseOrder(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.updatePurchaseOrder();
        }
    );

    router.post('/industry/purchase-orders/:id/approve', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.approvePurchaseOrder();
        }
    );

    router.post('/industry/purchase-orders/:id/deliver', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.deliverPurchaseOrder();
        }
    );

    // Workflow & Project Tracking
    router.get('/industry/workflows', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getWorkflows();
        }
    );

    router.get('/industry/workflows/:id', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getWorkflow();
        }
    );

    router.post('/industry/workflows/:id/update-status', 
        Middleware.isUserAuthorized,
        Validators.validateWorkflowUpdate(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.updateWorkflowStatus();
        }
    );

    router.get('/industry/workflows/:id/timeline', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getWorkflowTimeline();
        }
    );

    router.post('/industry/workflows/:id/milestones', 
        Middleware.isUserAuthorized,
        Validators.validateMilestoneUpdate(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.updateMilestones();
        }
    );

    // Payment Management
    router.get('/industry/payments', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getPayments();
        }
    );

    router.post('/industry/payments/:id/process', 
        Middleware.isUserAuthorized,
        Validators.validatePaymentProcessing(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.processPayment();
        }
    );

    router.get('/industry/payments/:id/status', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getPaymentStatus();
        }
    );

    router.post('/industry/payments/:id/approve', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.approvePayment();
        }
    );

    router.get('/industry/payments/reports', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getPaymentReports();
        }
    );

    // Document Management
    router.post('/industry/documents/upload', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.uploadDocument();
        }
    );

    router.get('/industry/documents', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getDocuments();
        }
    );

    router.get('/industry/documents/:id', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.downloadDocument();
        }
    );

    router.delete('/industry/documents/:id', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.deleteDocument();
        }
    );

    router.post('/industry/documents/:id/version', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.createDocumentVersion();
        }
    );

    // Compliance Management
    router.get('/industry/compliance', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getComplianceRecords();
        }
    );

    router.post('/industry/compliance/assessment', 
        Middleware.isUserAuthorized,
        Validators.validateComplianceAssessment(),
        Middleware.validateBody,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.createComplianceAssessment();
        }
    );

    // Analytics and Dashboard
    router.get('/industry/analytics/dashboard', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getDashboardAnalytics();
        }
    );

    router.get('/industry/analytics/performance', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getPerformanceAnalytics();
        }
    );

    router.get('/industry/analytics/spending', 
        Middleware.isUserAuthorized,
        (req, res) => {
            const controller = new IndustryController().boot(req, res);
            return controller.getSpendingAnalytics();
        }
    );

    app.use(config.baseApiUrl, router);
};
>>>>>>> 30ed529 (Initial commit)

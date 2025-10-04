<<<<<<< HEAD
const ProfessionalController = require('./Controller')

module.exports = (app, express) => {
    const router = express.Router();
    const Middleware = require("../../Services/Middleware");
    const Validators = require("./Validator");
    const config = require('../../../Configs/Config')

    router.post('/user/create-user121', (req,res)=>{
        const userController = new ProfessionalController().boot(req,res)
        return userController.createUser();
    });

    router.get('/user/get-profile121', 
        Middleware.isUserAuthorized, //for token validation
        (req,res,next)=>{
        const userController = new ProfessionalController().boot(req,res)
        return userController.getProfile(); //controller method to return res
    });

    app.use(config.baseApiUrl, router);
}
=======
const ProfessionalController = require("./Controller");

module.exports = (app, express) => {
  const router = express.Router();
  const Middleware = require("../../Services/Middleware");
  const Validators = require("./Validator");
  const config = require("../../../Configs/Config");

  // Create User
  router.post("/user/create-user121", (req, res) => {
    const userController = new ProfessionalController().boot(req, res);
    return userController.createUser();
  });

  // Get Profile
  router.get(
    "/user/get-profile121",
    Middleware.isUserAuthorized,
    (req, res) => {
      const userController = new ProfessionalController().boot(req, res);
      return userController.getProfile();
    }
  );

  // Get Professional Dashboard
  router.get(
    "/professionals/dashboard",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new ProfessionalController().boot(req, res);
      return controller.getDashboard();
    }
  );

  // Get Available Opportunities
  router.get(
    "/professionals/opportunities",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new ProfessionalController().boot(req, res);
      return controller.getOpportunities();
    }
  );

  // Apply for Opportunity
  router.post(
    "/professionals/opportunities/:id/apply",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new ProfessionalController().boot(req, res);
      return controller.applyForOpportunity();
    }
  );

  // Get My Applications
  router.get(
    "/professionals/applications",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new ProfessionalController().boot(req, res);
      return controller.getApplications();
    }
  );

  // Get Professional Calendar
  router.get(
    "/professionals/calendar",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new ProfessionalController().boot(req, res);
      return controller.getCalendar();
    }
  );

  // Set Availability
  router.post(
    "/professionals/availability",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new ProfessionalController().boot(req, res);
      return controller.setAvailability();
    }
  );

  // Get Earnings
  router.get(
    "/professionals/earnings",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new ProfessionalController().boot(req, res);
      return controller.getEarnings();
    }
  );

  // Get Certifications
  router.get(
    "/professionals/certifications",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new ProfessionalController().boot(req, res);
      return controller.getCertifications();
    }
  );

  // Add Certification
  router.post(
    "/professionals/certifications",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new ProfessionalController().boot(req, res);
      return controller.addCertification();
    }
  );

  // Update Professional Profile
  router.put(
    "/professionals/profile",
    Middleware.isUserAuthorized,
    (req, res) => {
      const controller = new ProfessionalController().boot(req, res);
      return controller.updateProfile();
    }
  );

  app.use(config.baseApiUrl, router);
};
>>>>>>> 30ed529 (Initial commit)

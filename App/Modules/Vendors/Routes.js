<<<<<<< HEAD
const {UserController} = require('./Controller')

module.exports = (app, express) => {
    const router = express.Router();
    const Middleware = require("../../Services/Middleware");
    const Validators = require("./Validator");
    const config = require('../../../Configs/Config')

    router.post('/user/create-user000', (req,res,next)=>{
        const userController = new UserController(req,res,next)
        return userController.createUser();
    });

    router.get('/user/get-profile000', 
        Middleware.isUserAuthorized, //for token validation
        (req,res,next)=>{
        const userController = new UserController(req,res,next)
        return userController.getProfile(); //controller method to return res
    });

    app.use(config.baseApiUrl, router);
}
=======
const UserController = require("./Controller"); // ✅ fixed

module.exports = (app, express) => {
  const router = express.Router();
  const Middleware = require("../../Services/Middleware");
  const Validators = require("./Validator");
  const config = require("../../../Configs/Config");

  router.post("/user/create-user000", (req, res, next) => {
    const userController = new UserController(req, res, next);
    return userController.createUser();
  });

  router.get(
    "/user/get-profile000",
    Middleware.isUserAuthorized,
    (req, res, next) => {
      const userController = new UserController(req, res, next);
      return userController.getProfile();
    }
  );

  app.use(config.baseApiUrl, router);
};
>>>>>>> 30ed529 (Initial commit)

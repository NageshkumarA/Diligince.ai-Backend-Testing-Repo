const UserController = require('./Controller')

module.exports = (app, express) => {
    const router = express.Router();
    const Middleware = require("../../Services/Middleware");
    const Validators = require("./Validator");
    const config = require('../../../Configs/Config')

    /********************************************************
	 user create api
	*********************************************************/
    router.post('/user/create-user', (req, res) => {
        const userController = new UserController().boot(req, res)
        return userController.createUser();
    });

/********************************************************
	 user login api
	*********************************************************/
  router.post(
    "/user/sign-in",
    Validators.verifySignIn(),
    Middleware.validateBody,
    (req, res, next) => {
      const userObj = new UserController().boot(req, res);
      return userObj.userSignIn();
    }
  );

    router.get('/user/get-profile',
        Middleware.isUserAuthorized, //for token validation
        (req, res, next) => {
            const userController = new UserController().boot(req, res)
            return userController.getProfile(); //controller method to return res
        });

    app.use(config.baseApiUrl, router);
}
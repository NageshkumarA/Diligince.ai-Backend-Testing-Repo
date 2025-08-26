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
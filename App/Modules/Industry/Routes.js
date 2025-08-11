const IndustryController = require('./Controller')

module.exports = (app, express) => {
    const router = express.Router();
    const Middleware = require("../../Services/Middleware");
    const Validators = require("./Validator");
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
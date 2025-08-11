// modules/user/routes.js
const {BaseController} = require('./Controller')

module.exports = (app, express) => {
    const router = express.Router();
    const Middleware = require("../../Services/Middleware");
    const Validators = require("./Validator");
    const config = require('../../../Configs/Config')

    router.get('/base/health-check', (req,res,next)=>{
        const baseController = new BaseController(req,res,next)
        return baseController.healthCheck();
    });

    app.use(config.baseApiUrl, router);
}
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
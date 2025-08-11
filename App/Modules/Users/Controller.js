const Controller = require("../Base/Controller")
const { IndustrySchema } = require("../Industry/Schema")
const {UserSchema} = require('./Schema')
const bcrypt = require('bcrypt')
class UserController extends Controller {
    constructor() {
        super();
    }
    async createUser() {
        try {
            const { accountType,role, companyName, industryType, termsAccepted, email, phone, password } = this.req.body;

            const existingCompany = await IndustrySchema.findOne({ companyName: companyName.trim() });
            if (existingCompany) {
                return this.res.status(400).send({
                    status: false,
                    message: 'Company name already exists'
                });
            }

            const industryDoc = new IndustrySchema({
                accountType,
                companyName,
                industryType,
                termsAccepted
            });
            await industryDoc.save();

            const passwordHash = await bcrypt.hash(password, 10);
            const userDoc = new UserSchema({
                email,
                phone,
                password:passwordHash,
                profileId: industryDoc._id,
                role
            });
            await userDoc.save();

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

module.exports = UserController
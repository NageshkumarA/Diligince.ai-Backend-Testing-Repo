const Middleware = require("../../Services/Middleware");
const Controller = require("../Base/Controller")
const { IndustrySchema, UserSchema } = require('./Schema')
const _ = require("lodash");

const bcryptjs = require('bcryptjs')
class UserController extends Controller {
    constructor() {
        super();
    }
    async createUser() {
        try {
            const { accountType, role = 'Industry', companyName, industryType, termsAccepted, email, phone, password } = this.req.body;

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

            const passwordHash = await bcryptjs.hash(password, 10);
            const userDoc = new UserSchema({
                email,
                phone,
                password: passwordHash,
                profileId: industryDoc._id,
                role: role || 'Industry'
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
    /********************************************************
@Purpose User Sign In
  @Parameter
  {
  email:"test@email.com",
  password:"Test@123"
  }
  @Return JSON String
********************************************************/
    async userSignIn() {
        try {
            //Generate Field Array and process the request body
            let fieldsArray = ["email", 'password', 'type'];
            let data = await new Middleware().processRequestBody(
                this.req.body,
                fieldsArray
            );
            data.email = data.email.toString().toLowerCase();
            //check user exist or not
            const user = await UserSchema.findOne({ 
                email: data.email, 
                $or: [
                    { role: data.type },
                    { role: data.type.charAt(0).toUpperCase() + data.type.slice(1) }
                ]
            });
            if (_.isEmpty(user)) {
                return this.res.send({
                    status: false,
                    statusCode: 200,
                    message: 'User not found.',
                    data: null
                })
            }

            //check password
            let currentPassword = user.password
            let passwdTest = await bcryptjs.compare(data?.password, currentPassword)
            if (!passwdTest) {
                return this.res.send({
                    status: false,
                    statusCode: 200,
                    message: 'Password is invalid',
                    data: null
                })
            }

            let tokenData = { ...user?._doc };
            delete tokenData.password

            //check inactive was deleted or not
            if (!user?.isEmailVerified) {
                return this.res.send({
                    status: false,
                    statusCode: 200,
                    message: 'Email not verified',
                    data: {}
                })
            }

            if (!user?.isPhoneVerified) {
                return this.res.send({
                    status: false,
                    statusCode: 200,
                    message: 'Phone not verified',
                    data: {}
                })
            }

            // Update last login
            user.lastLoginAt = new Date();
            user.loginAttempts = 0;
            await user.save();

            let token = await new Middleware().UserToken(tokenData);
            delete tokenData?.token
            return this.res.send({
                status: true,
                statusCode: 200,
                message: 'Login Success',
                data: { ...tokenData },
                meta: { access_token: token }
            })

        } catch (e) {
            console.log("Error on Sign in:\n", e)
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
            const userId = this.req.user?.id;
            let profileData = {};

            if (userId) {
                const user = await UserSchema.findById(userId).select('-password');
                profileData = user ? user.toObject() : {};
            }

            this.res.send({
                status: true,
                statusCode: 200,
                message: 'User Data',
                data: profileData
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
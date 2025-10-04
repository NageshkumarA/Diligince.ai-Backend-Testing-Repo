const Middleware = require("../../Services/Middleware");
<<<<<<< HEAD
const Controller = require("../Base/Controller")
const { IndustrySchema } = require("../Industry/Schema")
const { UserSchema } = require('./Schema')
const _ = require("lodash");

const bcrypt = require('bcrypt')
class UserController extends Controller {
    constructor() {
        super();
    }
    async createUser() {
        try {
            const { accountType, role, companyName, industryType, termsAccepted, email, phone, password } = this.req.body;

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
                password: passwordHash,
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
    /********************************************************
=======
const Controller = require("../Base/Controller");
const { IndustrySchema, UserSchema } = require("./Schema");
const _ = require("lodash");

const bcryptjs = require("bcryptjs");
class UserController extends Controller {
  constructor() {
    super();
  }
  async createUser() {
    try {
      const {
        accountType,
        role = "Industry",
        companyName,
        industryType,
        termsAccepted,
        email,
        phone,
        password,
      } = this.req.body;

      // Check for duplicate company name
      const existingCompany = await IndustrySchema.findOne({
        companyName: companyName.trim(),
      });
      if (existingCompany) {
        return this.res.status(400).send({
          status: false,
          message: "Company name already exists",
        });
      }

      // Check for duplicate email before saving
      const existingUser = await UserSchema.findOne({
        email: email.trim().toLowerCase(),
      });
      if (existingUser) {
        return this.res.status(400).send({
          status: false,
          message: "Email already exists",
        });
      }

      // Save industry
      const industryDoc = new IndustrySchema({
        accountType,
        companyName,
        industryType,
        termsAccepted,
      });
      await industryDoc.save();

      // Hash password and save user
      const passwordHash = await bcryptjs.hash(password, 10);
      const userDoc = new UserSchema({
        email: email.trim().toLowerCase(),
        phone,
        password: passwordHash,
        profileId: industryDoc._id,
        role: role || "Industry",
      });
      await userDoc.save();

      return this.res.send({
        status: true,
        statusCode: 200,
        message: "User created successfully",
        data: { id: userDoc._id, email: userDoc.email },
      });
    } catch (e) {
      console.log("Error on createUser:\n", e);

      // Special handling for Mongo duplicate key
      if (e.code === 11000 && e.keyPattern?.email) {
        return this.res.status(400).send({
          status: false,
          message: "Email already exists",
        });
      }
      if (e.code === 11000 && e.keyPattern?.companyName) {
        return this.res.status(400).send({
          status: false,
          message: "Company name already exists",
        });
      }

      return this.res.status(500).send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  /********************************************************
>>>>>>> 30ed529 (Initial commit)
@Purpose User Sign In
  @Parameter
  {
  email:"test@email.com",
  password:"Test@123"
  }
  @Return JSON String
********************************************************/
<<<<<<< HEAD
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
            const user = await UserSchema.findOne({ email: data.email, role: data.type });
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
            let passwdTest = await bcrypt.compare(data?.password, currentPassword)
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
=======
  async userSignIn() {
    try {
      const fieldsArray = ["email", "password", "type"];
      const data = await new Middleware().processRequestBody(
        this.req.body,
        fieldsArray
      );
      data.email = data.email.toString().toLowerCase();

      // Check if user exists by email
      const existingUser = await UserSchema.findOne({ email: data.email });
      if (!existingUser) {
        return this.res.send({
          status: false,
          statusCode: 404,
          message: "No user found with this email.",
          data: null,
        });
      }

      // Check if role matches or is compatible
      const validRoles = [
        data.type,
        `${data.type}Admin`,
        data.type.toLowerCase(),
      ];
      if (!validRoles.includes(existingUser.role)) {
        return this.res.send({
          status: false,
          statusCode: 403,
          message: `Role mismatch. This account is registered as '${existingUser.role}'.`,
          data: null,
        });
      }

      // Check password
      const passwdTest = await bcryptjs.compare(
        data.password,
        existingUser.password
      );
      if (!passwdTest) {
        return this.res.send({
          status: false,
          statusCode: 401,
          message: "Invalid password.",
          data: null,
        });
      }

      // Email/Phone verification checks
      //   if (!existingUser.isEmailVerified) {
      //     return this.res.send({
      //       status: false,
      //       statusCode: 403,
      //       message: "Email not verified.",
      //       data: {},
      //     });
      //   }

      //   if (!existingUser.isPhoneVerified) {
      //     return this.res.send({
      //       status: false,
      //       statusCode: 403,
      //       message: "Phone not verified.",
      //       data: {},
      //     });
      //   }

      // Update last login
      existingUser.lastLoginAt = new Date();
      existingUser.loginAttempts = 0;
      await existingUser.save();

      // Generate token
      const tokenData = { ...existingUser._doc };
      delete tokenData.password;
      const token = await new Middleware().UserToken(tokenData);

      return this.res.send({
        status: true,
        statusCode: 200,
        message: "Login successful.",
        data: tokenData,
        meta: { access_token: token },
      });
    } catch (e) {
      console.log("Error on Sign in:\n", e);
      this.res.send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }

  async getProfile() {
    try {
      const userId = this.req.user?.id;
      let profileData = {};

      if (userId) {
        const user = await UserSchema.findById(userId).select("-password");
        profileData = user ? user.toObject() : {};
      }

      this.res.send({
        status: true,
        statusCode: 200,
        message: "User Data",
        data: profileData,
      });
    } catch (e) {
      console.log("Error on health check:\n", e);
      this.res.send({
        status: false,
        statusCode: 500,
        message: "Internal server error",
        data: null,
      });
    }
  }
}

module.exports = UserController;
>>>>>>> 30ed529 (Initial commit)

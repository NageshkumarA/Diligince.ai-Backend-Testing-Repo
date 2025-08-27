// middlewares/authorization.js
const jwt = require('jsonwebtoken');
const Authentication = require("../../Modules/Users/Schema").Authtokens;
const { UserSchema } = require("../../Modules/Users/Schema");
const { Role, Permission } = require("../../Modules/Auth/Schema");
const config = require("../../../Configs/Config")
const Moment = require("moment");

class Middleware {
  static async isUserAuthorized(req, res, next) {
    try {
      const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ 
          status: false,
          message: 'No token, authorization denied' 
        });
      }

      // Verify token
      const decoded = jwt.verify(token, config.securityToken);
      
      // Check if token exists in database and is not expired
      const authToken = await Authentication.findOne({
        userId: decoded.id,
        'access_tokens.token': token,
        'access_tokens.tokenExpiryTime': { $gt: new Date() }
      });

      if (!authToken) {
        return res.status(401).json({ 
          status: false,
          message: 'Token is not valid or expired' 
        });
      }

      // Get user details
      const user = await UserSchema.findById(decoded.id).select('-password');
      if (!user || !user.isActive) {
        return res.status(401).json({ 
          status: false,
          message: 'User not found or inactive' 
        });
      }

      req.user = {
        id: user._id,
        email: user.email,
        role: user.role,
        profileId: user.profileId,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
      };
      
      next();
    } catch (err) {
      console.error('Auth middleware error:', err);
      res.status(401).json({ 
        status: false,
        message: 'Token is not valid' 
      });
    }
  }

  // Role-based authorization middleware
  static requireRole(roles) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            status: false,
            message: 'Authentication required'
          });
        }

        const userRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!userRoles.includes(req.user.role)) {
          return res.status(403).json({
            status: false,
            message: 'Insufficient permissions'
          });
        }

        next();
      } catch (error) {
        console.error('Role authorization error:', error);
        res.status(500).json({
          status: false,
          message: 'Authorization error'
        });
      }
    };
  }

  // Permission-based authorization middleware
  static requirePermission(permission) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            status: false,
            message: 'Authentication required'
          });
        }

        // Get user role permissions
        const role = await Role.findOne({ name: req.user.role });
        if (!role || !role.permissions.includes(permission)) {
          return res.status(403).json({
            status: false,
            message: 'Insufficient permissions'
          });
        }

        next();
      } catch (error) {
        console.error('Permission authorization error:', error);
        res.status(500).json({
          status: false,
          message: 'Authorization error'
        });
      }
    };
  }

  // Email verification required middleware
  static requireEmailVerification(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
    }

    if (!req.user.isEmailVerified) {
      return res.status(403).json({
        status: false,
        message: 'Email verification required'
      });
    }

    next();
  }

  // Phone verification required middleware
  static requirePhoneVerification(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
    }

    if (!req.user.isPhoneVerified) {
      return res.status(403).json({
        status: false,
        message: 'Phone verification required'
      });
    }

    next();
  }

  // Rate limiting middleware
  static rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    const requests = new Map();

    return (req, res, next) => {
      const key = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      if (requests.has(key)) {
        const userRequests = requests.get(key).filter(time => time > windowStart);
        requests.set(key, userRequests);
      }

      const userRequests = requests.get(key) || [];
      
      if (userRequests.length >= maxRequests) {
        return res.status(429).json({
          status: false,
          message: 'Too many requests, please try again later'
        });
      }

      userRequests.push(now);
      requests.set(key, userRequests);
      next();
    };
  }

  // Company member authorization
  static requireCompanyMember(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
    }

    if (!['IndustryAdmin', 'IndustryMember'].includes(req.user.role)) {
      return res.status(403).json({
        status: false,
        message: 'Company membership required'
      });
    }

    next();
  }

  // Company admin authorization
  static requireCompanyAdmin(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
    }

    if (!['SuperAdmin', 'IndustryAdmin'].includes(req.user.role)) {
      return res.status(403).json({
        status: false,
        message: 'Company admin privileges required'
      });
    }

    next();
  }

  // Super admin authorization
  static requireSuperAdmin(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        status: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({
        status: false,
        message: 'Super admin privileges required'
      });
    }

    next();
  }

  processRequestBody(body, fieldsArray) {
    return new Promise((resolve, reject) => {
      try {
        let data = {};
        fieldsArray.forEach((field) => {
          // field in body && typeof body[field] != "undefined" ? data[field] = typeof body[field] === 'string' ? body[field].trim() : body[field] : delete data[field]

          if (field in body && typeof body[field] != "undefined") {
            if (typeof body[field] === "string") {
              data[field] = body[field].trim();
            } else {
              data[field] = body[field];
            }
          } else {
            delete data[field];
          }
        });
        return resolve(data);
      } catch (error) {
        return reject({ status: 0, message: error });
      }
    });
  }


  /********************************************************
    @Purpose Function Joi req body validator
    @Parameter 
    {}
    @Return JSON String
    ********************************************************/
  static validateBody(req, res, next) {
    try {
      const { error, value } = req.schema.validate(req.body);
      if (error) {
        const message = error.details[0].message;
        return res.status(422).json({
          status: false,
          statusCode: 422,
          message: message,
          data: null
        });
      }
      req.body = value;
      next();
    } catch (error) {
      return res.status(500).json({ 
        status: false, 
        message: "Server error during validation" 
      });
    }
  }

  UserToken(params) {
    return new Promise((resolve, reject) => {
      (async () => {
        try {
          /********************************************************
         Generate header
        ********************************************************/
          let token = jwt.sign(
            {
              id: params._id,
              algorithm: "HS256",
              exp: Math.floor(Date.now() / 1000) + parseInt(config.tokenExpiry),
            },
            config.securityToken
          );
          params.token = token;
          params.userId = params._id;
          params.tokenExpiryTime = Moment().add(
            parseInt(config.tokenExpirationTime),
            "minutes"
          );

          /********************************************************
         Fetch user details from the server and update authtoken details
        ********************************************************/
          let fetchUser = await Authentication.findOne({
            userId: params.userId,
          });
          
          if (fetchUser) {
            let res = await Authentication.updateOne(
              { userId: params.userId },
              {
                $set: {
                  "access_tokens.0.token": token,
                  "access_tokens.0.tokenExpiryTime": params.tokenExpiryTime,
                  "access_tokens.0.deviceId": "web",
                },
              },
              { new: true, upsert: true }
            ).exec();
          } else {
            await Authentication.findOneAndUpdate(
              { userId: params.userId },
              {
                $push: {
                  access_tokens: {
                    token: token,
                    tokenExpiryTime: params.tokenExpiryTime,
                    deviceId: "web",
                  },
                },
              },
              { new: true, upsert: true }
            ).exec();
          }
          return resolve(token);
        } catch (err) {
          console.log("Get token", err);
          return reject({ message: err, status: 0 });
        }
      })();
    });
  }
}

module.exports = Middleware;

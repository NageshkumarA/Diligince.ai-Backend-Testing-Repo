// middlewares/authorization.js
const jwt = require('jsonwebtoken');
const Authentication = require("../../Modules/Users/Schema").Authtokens;
const config = require("../../../Configs/Config")
const Moment = require("moment");

class Middleware {
  static isUserAuthorized(req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded.user;
      next();
    } catch (err) {
      res.status(401).json({ message: 'Token is not valid' });
    }
  };


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
        const message = Array.isArray(error.details) ? error.details[0].message : error.message;
        return new CommonService().handleReject(res, HTTP_CODE.FAILED, HTTP_CODE.UNPROCESSABLE_ENTITY, message)
      }
      if (error) {
        return new CommonService().handleReject(res, HTTP_CODE.FAILED, HTTP_CODE.UNPROCESSABLE_ENTITY, error.details[0].message)
      }
      req.body = value;
      next();
    } catch (error) {
      return res.send({ status: 0, message: i18n.__("SERVER_ERROR") });
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
              id: params.id,
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
          delete params.id;

          /********************************************************
         Fetch user details from the server and update authtoken details
        ********************************************************/
          let fetchUser = await Authentication.findOne({
            userId: params.userId,
          });
          console.log(fetchUser?._doc)
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
            console.log(res)
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

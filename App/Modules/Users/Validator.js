/****************************
Validators
****************************/
const _ = require("lodash");
const Joi = require("joi");

class Validators {
    /********************************************************
     @Purpose Function for user sign in Validator
     @Parameter 
     {}
     @Return JSON String
  ********************************************************/
    static verifySignIn() {
        return async (req, res, next) => {
            try {
                req.schema = Joi.object().keys({
                    email: Joi.string().trim().required(),
                    password: Joi.string().trim().required(),
                    type: Joi.string().trim().required()
                });
                next();
            } catch (error) {
                throw new Error(error);
            }
        };
    }
}
module.exports = Validators;
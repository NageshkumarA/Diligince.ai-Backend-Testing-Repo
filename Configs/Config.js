/****************************
 Configuration
 ****************************/
// For environment variables [will work with .env file]
require('custom-env').env();

let ENV_VARIABLES = process.env;

console.log("ENV_VARIABLES ::", ENV_VARIABLES.db)

module.exports = {
    ...ENV_VARIABLES,
};
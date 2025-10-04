/****************************
 Configuration
 ****************************/
<<<<<<< HEAD
// For environment variables [will work with .env file]
require('custom-env').env();

let ENV_VARIABLES = process.env;

console.log("ENV_VARIABLES ::", ENV_VARIABLES.db)

module.exports = {
    ...ENV_VARIABLES,
};
=======
require("custom-env").env(); // Load .env file

const ENV_VARIABLES = process.env;

// Log MONGO_URI to check
console.log("ENV_VARIABLES ::", ENV_VARIABLES.MONGO_URI);

module.exports = {
  mongoUri: ENV_VARIABLES.MONGO_URI,
  baseApiUrl: ENV_VARIABLES.baseApiUrl || "/api/v1",
  env: ENV_VARIABLES.NODE_ENV || "development",
  serverPort: ENV_VARIABLES.serverPort || 5000,
  sessionSecret: ENV_VARIABLES.sessionSecret || "defaultSessionSecret",

  // JWT & Tokens
  securityToken: ENV_VARIABLES.securityToken || "defaultSecurityToken",
  emailVerificationSecret:
    ENV_VARIABLES.secretOrPrivateKey || "defaultEmailSecret",
  refreshTokenSecret:
    ENV_VARIABLES.secretOrPrivateKey || "defaultRefreshSecret",

  tokenExpiry: ENV_VARIABLES.tokenExpiry || 15,
  tokenExpirationTime: ENV_VARIABLES.tokenExpirationTime || 15,

  frontendUrl: ENV_VARIABLES.FRONTEND_URL || "http://localhost:3000",
};
>>>>>>> 30ed529 (Initial commit)

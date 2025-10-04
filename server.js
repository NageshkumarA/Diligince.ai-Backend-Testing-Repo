// Include Modules
const path = require("path");
const fs = require("fs");
const i18n = require("i18n");
let exp = require("express");
const config = require("./Configs/Config");
const express = require("./Configs/express");
const mongoose = require("./Configs/mongoose");
<<<<<<< HEAD
=======
const WebSocketService = require("./App/Services/WebSocketService");
>>>>>>> 30ed529 (Initial commit)
// const seedService = require("./app/services/Seed");
// let cronService = require("./app/services/Cron");
const listEndpoints = require('express-list-endpoints');

i18n.configure({
  locales: ["en", "es", "de"],
<<<<<<< HEAD
  directory: __dirname + "/app/locales",
=======
  directory: __dirname + "/App/locales",
>>>>>>> 30ed529 (Initial commit)
  defaultLocale: "en",
});
const swaggerUi = require("swagger-ui-express");

global.appRoot = path.resolve(__dirname);

db = mongoose();
const app = express();

<<<<<<< HEAD
=======
// Initialize WebSocket service
const webSocketService = new WebSocketService();

>>>>>>> 30ed529 (Initial commit)
app.get("/", function (req, res) {
  res.send("hello world");
});

/* Old path for serving public folder */
app.use("/public", exp.static(__dirname + "/public"));

<<<<<<< HEAD
app.listen(parseInt(config.serverPort), async () => {
  console.log("process.env.NODE_ENV", process.env.NODE_ENV);
  console.log(`Server running at http://localhost:${config.serverPort}`);
});
=======
const server = app.listen(parseInt(config.serverPort), async () => {
  console.log("process.env.NODE_ENV", process.env.NODE_ENV);
  console.log(`Server running at http://localhost:${config.serverPort}`);
});

// Initialize WebSocket server
webSocketService.initialize(server);
>>>>>>> 30ed529 (Initial commit)

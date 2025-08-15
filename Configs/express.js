/****************************
 EXPRESS AND ROUTING HANDLING
 ****************************/

const express = require('express');
const morgan = require('morgan');
const morganBody = require('morgan-body');
const compress = require('compression');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const mongoSanitize = require('express-mongo-sanitize')
const cors = require('cors'); //For cross domain error
const fs = require('fs');

const timeout = require('connect-timeout');
const glob = require('glob');

const config = require('./Config');
const logger = require('../App/Services/logger');


module.exports = function () {
  console.log('env - ' + process.env.NODE_ENV)
  let app = express();

  const winStream = {
    // Use the http severity
    write: (message) => logger.http(message),
  };
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else if (process.env.NODE_ENV === 'production') {
    app.use(compress({ threshold: 2 }));
  }

  app.use(bodyParser.urlencoded({
    limit: "50mb",
    extended: true
  }));

  app.use(bodyParser.json());
  // morgan body prints req res body in log file.
  morganBody(app, { logReqDateTime: false, logReqUserAgent: false, noColors: true, stream: winStream });

  app.use(methodOverride());

  app.use(cors());
  app.use(mongoSanitize())

  // =======   Settings for CORS
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  app.use(timeout(120000));
  app.use(haltOnTimedout);

  function haltOnTimedout(req, res, next) {
    if (!req.timedout) next();
  }

  app.use((err, req, res, next) => {
    return res.send({
      status: 0,
      statusCode: 500,
      message: err.message,
      error: err
    });
  })

  app.use(session({
    cookie: { maxAge: 30000 },
    saveUninitialized: true,
    resave: true,
    secret: config.sessionSecret
  }));

  app.use(express.json());
  // =======   Routing
  const modules = '/../App/Modules';
  glob(__dirname + modules + '/**/*Routes.js', {}, (err, files) => {
    files.forEach((route) => {
      const stats = fs.statSync(route);
      const fileSizeInBytes = stats.size;
      if (fileSizeInBytes) {
        require(route)(app, express);
      }
    });
  });

  return app;
};
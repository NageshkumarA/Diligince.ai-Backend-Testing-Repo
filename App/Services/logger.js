const winston = require("winston");
const config = require("../../Configs/Config");

// Severity levels, Based on this log files get created. 
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colors are used to distinguish between levels
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

// Formats used in log file.
const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const logFilePath = config.LOG_PATH + "\/" + config.LOG_FILE;
// Different transports to create different log files or console
const transports = [
  new winston.transports.File({
    filename: logFilePath
  })
]
// created longer object to be exported and used for logger 
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'http',
  levels,
  format,
  transports,
});

module.exports = logger;
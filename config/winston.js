const appRoot = require('app-root-path');
const winston = require('winston');

// define the custom settings for each transport (file, console)
let options = {
    file: {
        level: 'info',
        filename: `../logs/app.log`,
        handleExceptions: true,
        json: false,
        maxsize: 5242880, // 5MB
        colorize: false,
        timestamp: true
    },
    problem: {
        level: 'warn',
        filename: `../logs/warn.log`,
        handleExceptions: true,
        json: false,
        maxsize: 5242880, // 5MB
        colorize: false,
        timestamp: true
    },
    console: {
        level: 'debug',
        handleExceptions: true,
        json: false,
        colorize: true,
        timestamp: true
    },
};

// instantiate a new Winston Logger with the settings defined above
let logger = new winston.createLogger({
    transports: [
        new winston.transports.File(options.file),
        new winston.transports.File(options.problem),
        new winston.transports.Console(options.console)
    ],
    exitOnError: false, // do not exit on handled exceptions,
    format: winston.format.simple(),
    timestamp: true
});

// create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
    write: function (message, encoding) {
        // use the 'info' log level so the output will be picked up by both transports (file and console)
        logger.info(message);
    },
};

module.exports = logger;
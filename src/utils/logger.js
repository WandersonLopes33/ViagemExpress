const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Definir níveis de log
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Definir cores para cada nível
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

// Formato de log
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        let msg = `${timestamp} [${level}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        
        return msg;
    })
);

// Transports (onde os logs serão gravados)
const transports = [];

// Console transport (desenvolvimento)
if (process.env.LOG_CONSOLE_ENABLED !== 'false') {
    transports.push(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ all: true }),
                format
            ),
        })
    );
}

// File transports (produção)
if (process.env.LOG_FILE_ENABLED === 'true') {
    const logDir = path.join(__dirname, '../../logs');
    
    // Log de erro
    transports.push(
        new DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '14d',
            format: format,
        })
    );
    
    // Log completo
    transports.push(
        new DailyRotateFile({
            filename: path.join(logDir, 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: format,
        })
    );
}

// Criar logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format,
    transports,
    exitOnError: false,
});

// Stream para integração com Morgan (HTTP logging)
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

module.exports = logger;

import winston from 'winston';

export class LoggerFactory {
  public static createLogger(
    suppressInitMsg?: boolean,
    enableTTY?: boolean
  ): winston.Logger {
    const logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({
          filename: 'combined.log',
          level: 'info',
        }),
      ],
    });
    if (process.env.NODE_ENV === 'development' || enableTTY === true) {
      logger.add(
        new winston.transports.Console({
          level: 'verbose',
          format: winston.format.combine(
            winston.format.simple(),
            winston.format.timestamp({format: 'YY-MM-DD HH:MM:SS'}),
            winston.format.colorize({all: true})
          ),
        })
      );
    }
    if (suppressInitMsg !== true) logger.verbose('using winston for logging');
    return logger;
  }
}

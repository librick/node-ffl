import express from 'express';
import {Logger} from 'winston';

export class StatusServer {
  private readonly app: express.Application;
  constructor(
    private readonly logger: Logger,
    private readonly host: string,
    private readonly port: number
  ) {
    this.app = express();
    this.app.get('/status', (req, res) => {
      return res.send(200);
    });
  }
  public start(): Promise<void> {
    return new Promise(resolve => {
      const url = `http://${this.host}:${this.port}`;
      this.logger.info(`attempting to start status server at ${url}`);
      this.app.listen(this.port, this.host, () => {
        this.logger.info(`status server listening at ${url}`);
        return resolve();
      });
    });
  }
}

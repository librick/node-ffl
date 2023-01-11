import axios, {AxiosInstance} from 'axios';
import {convictConfig as conf, EMPTY_STRING, EMPTY_USERNAME} from './Convict';
import {wrapper} from 'axios-cookiejar-support';
import {CookieJar} from 'tough-cookie';
import {Logger} from 'winston';
import {Institution, InstitutionUrls} from './types/InstitutionTypes';
import {FiservApi} from './FiservApi';
import {LoggerFactory} from './utils/LoggerFactory';
import {HighLevelApi} from './HighLevelApi';
import {
  SecurityAnswer,
  SecurityAnswerRegistry,
} from './utils/SecurityAnswerRegistry';
import convict from 'convict';
import {StatusServer} from './StatusServer';

(async () => {
  loadEnvFileIfExists(conf);
  conf.validate({allowed: 'strict'});
  const enableTty = conf.get('enableTty');
  const logger = LoggerFactory.createLogger(true, enableTty);
  logConfig(logger, conf);

  const iniUrl = conf.get('url');
  const institution = getInstitutionFromUrl(iniUrl);
  const userAgent = conf.get('userAgent');
  const username = conf.get('username');
  const password = conf.get('password');
  const statusHost = conf.get('statusHost');
  const statusPort = conf.get('statusPort');

  logger.verbose(`enableTty: ${enableTty}`);
  logger.verbose(`iniUrl: ${iniUrl}`);
  logger.verbose(`institution: ${institution}`);
  logger.verbose(`userAgent: ${userAgent}`);

  if (username === EMPTY_USERNAME)
    throw new Error('failed to parse username, no username set');
  if (password === EMPTY_STRING)
    throw new Error('failed to parse password, no password set');
  const secAnsReg = new SecurityAnswerRegistry();
  secAnsReg.registerAnswers([
    {type: SecurityAnswer.SPORT, answer: conf.get('secSport')},
    {type: SecurityAnswer.EMPLOYER, answer: conf.get('secEmployer')},
    {type: SecurityAnswer.CAR, answer: conf.get('secCar')},
  ]);

  const statusServer = new StatusServer(logger, statusHost, statusPort);
  await statusServer.start();
  const cookieJar = new CookieJar();
  const axiosClient = wrapper(axios.create({jar: cookieJar, timeout: 5000}));
  addLoggerToAxiosClient(logger, axiosClient);
  const api = new FiservApi({
    logger,
    axiosClient,
    cookieJar,
    institution,
    username,
    password,
    userAgent,
  });
  const crontab = '0 6,18 * * *'; // Every day at 06:00 and 18:00 UTC.
  const txnExporter = new HighLevelApi(logger, api, secAnsReg, crontab);
  await txnExporter.exportTxns();
})();

function loadEnvFileIfExists<T>(conf: convict.Config<T>) {
  const env = process.env.NODE_ENV;
  try {
    conf.loadFile('./' + env + '.env.json');
  } catch {
    // ignore error
  }
}

function logConfig<T>(logger: Logger, conf: convict.Config<T>) {
  logger.verbose('logging configuration settings');
  const keys = Object.keys(conf.getProperties() as any);
  keys.forEach(k => logger.verbose(`key: ${k}, value: ${conf.get(k as any)}`));
  logger.verbose('done logging configuration settings');
}

function getInstitutionFromUrl(url: string): Institution {
  let formattedUrl = url;
  if (formattedUrl.endsWith('/')) formattedUrl = formattedUrl.slice(0, -1);
  const institutions: Institution[] = Object.keys(InstitutionUrls).map(
    k => k as unknown as Institution
  );
  for (const ini of institutions) {
    if (formattedUrl === InstitutionUrls[ini]) return ini;
  }
  throw new Error(`failed to parse institution, url: ${formattedUrl}`);
}

function addLoggerToAxiosClient(logger: Logger, client: AxiosInstance) {
  client.interceptors.request.use(req => {
    logger.info(`starting request, method: ${req.method}, url: ${req.url}`);
    return req;
  });
  client.interceptors.response.use(res => {
    logger.info(`got response, status: ${res.status} ${res.statusText}`);
    return res;
  });
}

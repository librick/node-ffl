import convict from 'convict';
export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36';
export const EMPTY_USERNAME = '';
export const EMPTY_STRING = '';

export const convictConfig = convict({
  env: {
    doc: 'The application environment.',
    default: 'development',
    format: ['production', 'development', 'test'],
    env: 'NODE_ENV',
  },
  enableTty: {
    doc: 'Write logs to stdout.',
    default: false,
    format: Boolean,
    env: 'FFL_ENABLE_TTY',
  },
  url: {
    doc: 'The homepage URL of your bank/institution.',
    default: EMPTY_STRING,
    format: String,
    env: 'FFL_INSTITUTION_URL',
  },
  username: {
    doc: 'The username of your bank account',
    default: EMPTY_USERNAME,
    format: String,
    env: 'FFL_USERNAME',
  },
  password: {
    doc: 'The password of your bank account',
    default: EMPTY_STRING,
    format: String,
    env: 'FFL_PASSWORD',
  },
  secSport: {
    doc: 'The security answer for your favorite sport',
    default: EMPTY_STRING,
    format: String,
    env: 'FFL_SEC_SPORT',
  },
  secEmployer: {
    doc: 'The security answer for your first employer',
    default: EMPTY_STRING,
    format: String,
    env: 'FFL_SEC_EMPLOYER',
  },
  secCar: {
    doc: 'The security answer for the model of your first car',
    default: EMPTY_STRING,
    format: String,
    env: 'FFL_SEC_CAR',
  },
  userAgent: {
    doc: 'The HTTP User-Agent for requests',
    default: DEFAULT_USER_AGENT,
    format: String,
    env: 'FFL_USERAGENT',
    nullable: true,
  },
  statusHost: {
    doc: 'The hostname of the status http server',
    default: '127.0.0.1',
    format: String,
    env: 'FFL_STATUS_SERVER_HOST',
  },
  statusPort: {
    doc: 'The port of the status http server',
    default: 8080,
    format: Number,
    env: 'FFL_STATUS_SERVER_PORT',
  },
});

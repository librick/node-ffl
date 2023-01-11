import {AxiosInstance, AxiosResponse} from 'axios';
import qs from 'qs';
import {Cookie, CookieJar} from 'tough-cookie';
import {CookieFactory} from './utils/CookieFactory';
import {HtmlParser} from './utils/HtmlParser';
import {
  Institution,
  InstitutionNames,
  InstitutionRoutingNumbers,
  InstitutionUrls,
} from './types/InstitutionTypes';
import {z} from 'zod';
import {
  TransactionCollectionSchema,
  TransactionSchema,
} from './schemas/TransactionSchemas';
import {AccountCollectionSchema} from './schemas/AccountSchemas';
import {Logger} from 'winston';
import {DEFAULT_USER_AGENT} from './Convict';
import {CookieValidators} from './utils/CookieValidators';
import {SecurityQuestion} from './utils/SecurityAnswerRegistry';

type LoginRedirectToken = string;
type MFAAnswerRedirectToken = string;
type TSCookie = Cookie;
type SessionContext = Cookie;

// Include the url of requests for subsequent requests to set the referer header
type ResBase = {refererNext: string};

export type LoginRes = {
  sc: SessionContext;
  pb: Cookie;
  pm: Cookie;
  ts: TSCookie;
  redirectToken: LoginRedirectToken;
};
type SecurityQuestionOpts = {
  sc: SessionContext;
  pm: Cookie;
  pb: Cookie;
  ts: TSCookie;
  redirectToken: LoginRedirectToken;
};
export type SecurityQuestionRes = ResBase & {
  pm: Cookie;
  rv: Cookie;
  ts: TSCookie;
  antiForgeryToken: string;
  question: SecurityQuestion;
};
type SecurityAnswerOpts = {
  referer: string;
  rv: Cookie; // The ____RequestVerificationCookie from GET /MFA/SecurityChallenge res's headers
  pb: Cookie;
  pm: Cookie;
  sc: SessionContext;
  ts: TSCookie;
  redirectToken: LoginRedirectToken;
  rvBody: string; // The antiForgeryToken from GET /MFA/SecurityChallenge res's html
  answer: string;
};
export type SecurityAnswerRes = ResBase & {
  auth: Cookie;
  pm: Cookie;
  ts: TSCookie;
  redirectToken: MFAAnswerRedirectToken;
};
type HomeOpts = {
  referer: string;
  redirectToken: MFAAnswerRedirectToken;
  rv: Cookie;
  auth: Cookie;
  pb: Cookie;
  pm: Cookie;
  sc: SessionContext;
  ts: TSCookie;
};
export type HomeRes = ResBase & {
  pageNonce: string;
};
type AccountListOpts = {
  referer: string;
  urlToken: string; // from the home page's pageNonce
  redirectToken: string; // just used for referer
  rv: Cookie;
  auth: Cookie;
  pb: Cookie;
  pm: Cookie;
  sc: SessionContext;
  ts: TSCookie;
};
export type AccountListRes = ResBase & {
  data: z.infer<typeof AccountCollectionSchema>;
};
type GetTransactionsOpts = {
  getMore: boolean;
  referer: string;
  urlToken: string;
  accountId: string;
  rv: Cookie;
  auth: Cookie;
  pb: Cookie;
  pm: Cookie;
  sc: SessionContext;
  ts: TSCookie;
};

export type Transaction = z.infer<typeof TransactionSchema>;
type GetTransactionsRes = ResBase & {
  data: z.infer<typeof TransactionCollectionSchema>;
};

export type FiservApiOpts = {
  logger: Logger;
  axiosClient: AxiosInstance;
  cookieJar: CookieJar;
  institution: Institution;
  username: string;
  password: string;
  fiservHostname?: string;
  themeNumber?: number;
  userAgent?: string;
  enableDNT?: boolean;
};
export class FiservApi {
  private readonly logger: Logger;
  private readonly axiosClient: AxiosInstance;
  private readonly cookieJar: CookieJar;
  private readonly institution: Institution;
  private readonly username: string;
  private readonly password: string;
  private readonly fiservHostname: string;
  private readonly themeNumber: number;
  private readonly userAgent: string;
  private readonly enableDNT: boolean;
  private readonly routingNumber: string;
  private readonly accept: string;
  private readonly acceptLanguage: string;
  private readonly acceptEncoding: string;
  private readonly fiservBaseUrl: string;

  constructor(opts: FiservApiOpts) {
    this.logger = opts.logger;
    this.axiosClient = opts.axiosClient;
    this.cookieJar = opts.cookieJar;
    this.institution = opts.institution;
    this.username = opts.username;
    this.password = opts.password;
    this.fiservHostname = opts.fiservHostname ?? 'retailonline.fiservapps.com';
    this.themeNumber = opts.themeNumber ?? 1;
    this.userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
    this.enableDNT = opts.enableDNT ?? true;
    this.routingNumber = InstitutionRoutingNumbers[opts.institution];
    this.accept =
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
    this.acceptLanguage = 'en-US,en;q=0.5';
    this.acceptEncoding = 'gzip, deflate, br';
    this.fiservBaseUrl = `https://${this.fiservHostname}`;
    this.logger.info(
      `starting api, institution: ${InstitutionNames[
        this.institution
      ].toLowerCase()}`
    );
  }

  public async StartLogin(): Promise<LoginRes> {
    const method = 'POST';
    const url = `${this.fiservBaseUrl}/Login/RemoteSubmit/${this.routingNumber}/${this.themeNumber}`;
    const headers = {
      Host: this.fiservHostname,
      'User-Agent': this.userAgent,
      Accept: this.accept,
      'Accept-Language': this.acceptLanguage,
      'Accept-Encoding': this.acceptEncoding,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      DNT: 1 as number | undefined,
      Origin: InstitutionUrls[this.institution],
      Connection: 'keep-alive',
      Referer: `${InstitutionUrls[this.institution]}/`,
      'Upgrade-Insecure-Requests': 1,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
    };
    if (this.enableDNT !== true) delete headers['DNT'];
    if (process.env.NODE_ENV === 'developement') {
      this.logger.info(`using username: ${this.username}`);
      this.logger.info(`using password: ${this.password}`);
    }
    const data = urlEncodeFormData({
      username: this.username,
      password: this.password,
      maskLoginInputs: false,
      fingerprint: 'null',
      pluginCount: '5',
      timezoneOffset: '0',
      timestampUtc: new Date(Date()).toUTCString(),
    });
    // No cookies should be sent by the client
    await this.cookieJar.removeAllCookies();
    const res = await this.axiosClient({
      method,
      url,
      headers,
      data,
      maxRedirects: 0, // handle redirect manually
      validateStatus: s => s === 302,
    });

    // If the PMData cookie is not set, the password may be wrong
    const cookies = await this.cookieJar.getCookies(this.fiservBaseUrl);
    const pmData = cookies.find(x => x.key === 'PMData');
    if (pmData === undefined)
      this.logger.error('PMData cookie not set, is your password correct?');

    const sc = await this.getCookieByKey('SessionContext');
    const pb = await this.getCookieByKey('PBISession');
    const pm = await this.getCookieByKey('PMData');
    const ts = await this.getCookieByKey('TS01d4e29a');
    CookieValidators.validateSessionContext(
      sc.value,
      this.routingNumber,
      this.themeNumber
    );
    CookieValidators.validatePBISession(pb.value);
    CookieValidators.validatePMData(pm.value);
    CookieValidators.validateTS(ts.value);
    const redirectUrl = getLocationFromRes(res);
    const redirectToken = this.getTokenFromRedirectUrl(redirectUrl);
    return {sc, pb, pm, ts, redirectToken};
  }

  public async StartSecurityQuestion(
    opts: SecurityQuestionOpts
  ): Promise<SecurityQuestionRes> {
    const method = 'GET';
    assertNotUrlEncoded(opts.redirectToken);
    const url = `${
      this.fiservBaseUrl
    }/MFA/SecurityChallenge?Token=${encodeURIComponent(opts.redirectToken)}`;
    const headers = {
      Host: this.fiservHostname,
      'User-Agent': this.userAgent,
      Accept: this.accept,
      'Accept-Language': this.acceptLanguage,
      'Accept-Encoding': this.acceptEncoding,
      DNT: 1 as number | undefined,
      Connection: 'keep-alive',
      Referer: `${InstitutionUrls[this.institution]}/`,
      'Upgrade-Insecure-Requests': 1,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
    };
    if (this.enableDNT !== true) delete headers['DNT'];
    await this.cookieJar.removeAllCookies();
    await this.cookieJar.setCookie(opts.pb, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.pm, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.sc, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.ts, this.fiservBaseUrl);
    const res = await this.axiosClient({method, url, headers});
    if (res.status !== 200) {
      throw new Error(`expected 200 status, got ${res.status}`);
    }
    if (HtmlParser.looksLikeHtml(res.data) !== true) {
      throw new Error('res.data not html');
    }
    const question = HtmlParser.parseSecurityQuestion(res.data);
    const antiForgeryToken = HtmlParser.parseAntiForgeryToken(res.data);
    const _pm = await this.getCookieByKey('PMData');
    const _rv = await this.getCookieByKey('__RequestVerificationCookie');
    const _ts = await this.getCookieByKey('TS01d4e29a');
    CookieValidators.validatePMData(_pm.value);
    CookieValidators.validateTS(_ts.value);
    return {
      pm: _pm,
      rv: _rv,
      ts: _ts,
      question,
      antiForgeryToken,
      refererNext: url,
    };
  }

  public async SendSecurityAnswer(
    opts: SecurityAnswerOpts
  ): Promise<SecurityAnswerRes> {
    const method = 'POST';
    assertNotUrlEncoded(opts.redirectToken);
    const url = `${
      this.fiservBaseUrl
    }/MFA/Submit/Web?Token=${encodeURIComponent(opts.redirectToken)}`;
    const headers = {
      Host: this.fiservHostname,
      'User-Agent': this.userAgent,
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': this.acceptLanguage,
      'Accept-Encoding': this.acceptEncoding,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      DNT: 1 as number | undefined,
      Origin: this.fiservBaseUrl,
      Referer: opts.referer,
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': 1,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (this.enableDNT !== true) delete headers['DNT'];
    const data = urlEncodeFormData({
      answer: opts.answer,
      dontChallengeMe: 'false',
      __RequestVerificationToken: opts.rvBody,
    });
    await this.cookieJar.removeAllCookies();
    await this.cookieJar.setCookie(
      CookieFactory.getBannerDisplayIndexCookie(),
      this.fiservBaseUrl
    );
    await this.cookieJar.setCookie(opts.rv, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.pb, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.pm, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.sc, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.ts, this.fiservBaseUrl);
    const res = await this.axiosClient({method, url, headers, data});
    if (res.status !== 200)
      throw new Error(`expected 200 status, got ${res.status}`);
    if (typeof res.data?.redirectUrl !== 'string')
      throw new Error('res.data.redirectUrl is not a string');
    if (typeof res.data?.success !== 'boolean')
      throw new Error('res.data.success is not a boolean');
    if (res.data.success !== true)
      throw new Error('res.data.success is not true');
    const redirectUrl = res.data.redirectUrl;
    const redirectToken = this.getTokenFromRedirectUrl(redirectUrl);
    const _auth = await this.getCookieByKey('Auth');
    const _pm = await this.getCookieByKey('PMData');
    const _ts = await this.getCookieByKey('TS01d4e29a');
    CookieValidators.validatePMData(_pm.value);
    CookieValidators.validateTS(_ts.value);
    return {
      auth: _auth,
      pm: _pm,
      ts: _ts,
      redirectToken,
      refererNext: url,
    };
  }

  public async GetHome(opts: HomeOpts): Promise<HomeRes> {
    const method = 'GET';
    assertNotUrlEncoded(opts.redirectToken);
    const url = `${this.fiservBaseUrl}/?Token=${encodeURIComponent(
      opts.redirectToken
    )}`;
    const headers = {
      Host: this.fiservHostname,
      'User-Agent': this.userAgent,
      Accept: this.accept,
      'Accept-Language': this.acceptLanguage,
      'Accept-Encoding': this.acceptEncoding,
      DNT: 1 as number | undefined,
      Connection: 'keep-alive',
      Referer: opts.referer,
      'Upgrade-Insecure-Requests': 1,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
    };
    if (this.enableDNT !== true) delete headers['DNT'];
    await this.cookieJar.removeAllCookies();
    await this.cookieJar.setCookie(opts.rv, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.auth, this.fiservBaseUrl);
    await this.cookieJar.setCookie(
      CookieFactory.getBannerDisplayIndexCookie(),
      this.fiservBaseUrl
    );
    await this.cookieJar.setCookie(opts.pb, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.pm, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.sc, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.ts, this.fiservBaseUrl);
    const res = await this.axiosClient({method, url, headers});
    if (res.status !== 200)
      throw new Error(`expected 200 status, got ${res.status}`);
    if (HtmlParser.looksLikeHtml(res.data) !== true)
      throw new Error('res.data is not html');
    const pageNonce = HtmlParser.parsePageNonce(res.data);
    return {pageNonce, refererNext: url};
  }

  public async GetAccountList(opts: AccountListOpts): Promise<AccountListRes> {
    const method = 'GET';
    assertNotUrlEncoded(opts.urlToken);
    const encToken = encodeURIComponent(opts.urlToken);
    const url = `${
      this.fiservBaseUrl
    }/Home/AccountList?Token=${encToken}&_=${new Date().getTime()}`;
    const headers = {
      Host: this.fiservHostname,
      'User-Agent': this.userAgent,
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': this.acceptLanguage,
      'Accept-Encoding': this.acceptEncoding,
      DNT: 1 as number | undefined,
      Connection: 'keep-alive',
      Referer: opts.referer,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (this.enableDNT !== true) delete headers['DNT'];
    await this.cookieJar.removeAllCookies();
    await this.cookieJar.setCookie(opts.rv, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.auth, this.fiservBaseUrl);
    await this.cookieJar.setCookie(
      CookieFactory.getBannerDisplayIndexCookie(),
      this.fiservBaseUrl
    );
    await this.cookieJar.setCookie(opts.pb, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.pm, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.sc, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.ts, this.fiservBaseUrl);
    const res = await this.axiosClient({method, url, headers});
    // Validate response status
    if (res.status !== 200)
      throw new Error(`expected 200 status, got ${res.status}`);
    // Validate response data
    const expContentType = 'application/json; charset=utf-8';
    if (res.headers['content-type'] !== expContentType)
      throw new Error('content-type not json');
    const parseRes = AccountCollectionSchema.safeParse(res.data);
    if (parseRes.success !== true) {
      this.logger.error(parseRes.error.message);
      throw new Error('failed to parse json according to schema');
    }
    return {data: parseRes.data, refererNext: url};
  }

  public async GetTransactions(
    opts: GetTransactionsOpts
  ): Promise<GetTransactionsRes> {
    const method = 'GET';
    if (opts.urlToken.includes('%3D') || opts.urlToken.includes('%25'))
      throw new Error('provided token is unexpectedly url encoded');
    const pathPart = opts.getMore ? 'GetMore' : 'Get';
    const encToken = encodeURIComponent(opts.urlToken);
    const url = `${this.fiservBaseUrl}/Transaction/${pathPart}/${
      opts.accountId
    }?Token=${encToken}&_=${new Date().getTime()}`;
    const headers = {
      Host: this.fiservHostname,
      'User-Agent': this.userAgent,
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': this.acceptLanguage,
      'Accept-Encoding': this.acceptEncoding,
      DNT: 1 as number | undefined,
      Connection: 'keep-alive',
      Referer: opts.referer,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (this.enableDNT !== true) delete headers['DNT'];
    await this.cookieJar.removeAllCookies();
    await this.cookieJar.setCookie(opts.rv, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.auth, this.fiservBaseUrl);
    await this.cookieJar.setCookie(
      CookieFactory.getBannerDisplayIndexCookie(),
      this.fiservBaseUrl
    );
    await this.cookieJar.setCookie(opts.pb, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.pm, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.sc, this.fiservBaseUrl);
    await this.cookieJar.setCookie(opts.ts, this.fiservBaseUrl);
    const res = await this.axiosClient({method, url, headers});
    // Validate response status
    if (res.status !== 200)
      throw new Error(`expected 200 status, got ${res.status}`);
    // Validate response data
    const expContentType = 'application/json; charset=utf-8';
    if (res.headers['content-type'] !== expContentType)
      throw new Error('content-type not json');
    const parseRes = TransactionCollectionSchema.safeParse(res.data);
    if (parseRes.success !== true) {
      this.logger.error(parseRes.error.message);
      throw new Error('failed to parse json according to schema');
    }
    return {data: parseRes.data, refererNext: url};
  }

  private async getCookieByKey(key: string): Promise<Cookie> {
    this.logger.verbose(
      `attempting to get cookie, key: ${key}, fiserv url: ${this.fiservBaseUrl}`
    );
    const cookies = await this.cookieJar.getCookies(this.fiservBaseUrl);
    const c = cookies.find(x => x.key === key);
    if (c === undefined)
      throw new Error(
        `failed to get cookie ${key}, no cookie found with that key`
      );
    this.logger.verbose(`successfully retrieved cookie, key: ${c.key}`);
    return c;
  }

  private getTokenFromRedirectUrl(url: string): string {
    const key = 'Token';
    const urlObj = new URL(url);
    if (urlObj.hostname !== this.fiservHostname)
      throw new Error('failed to parse token from url, unexpected hostname');
    if (urlObj.protocol !== 'https:')
      throw new Error('failed to parse token from url, unexpected protocol');
    if (urlObj.password !== '')
      throw new Error('failed to parse token from url, url contains password');
    const value = urlObj.searchParams.get(key);
    if (value === null)
      throw new Error(
        `failed to parse token from url, no param with key ${key}`
      );
    return value;
  }
}

function assertNotUrlEncoded(str: string): void {
  // %3D encodes "=", %25 encodes "%".
  if (str.includes('%3D') || str.includes('%25'))
    throw new Error('provided token is unexpectedly url encoded');
}

function urlEncodeFormData(body: Record<string, string | boolean>): string {
  // Use RFC1738 to encode spaces as '+' rather than '%20'.
  return qs.stringify(body, {format: 'RFC1738'});
}

function getLocationFromRes(res: AxiosResponse): string {
  if (typeof res.headers['location'] === 'string')
    return res.headers['location'];
  throw new Error(
    'failed to parse location from header, location header not a string'
  );
}

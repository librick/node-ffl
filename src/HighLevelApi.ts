import {Logger} from 'winston';
import {
  FiservApi,
  SecurityAnswerRes,
  SecurityQuestionRes,
  Transaction,
} from './FiservApi';
import {CronJob} from 'cron';
import {LoginRes, AccountListRes, HomeRes} from './FiservApi';
import {CSVExporter} from './exporters/CsvExporter';
import {SecurityAnswerRegistry} from './utils/SecurityAnswerRegistry';

export class HighLevelApi {
  constructor(
    private readonly logger: Logger,
    private readonly api: FiservApi,
    private readonly secAnsReg: SecurityAnswerRegistry,
    crontab: string
  ) {
    const onTick = () => this.exportTxns();
    const job = new CronJob({cronTime: crontab, onTick, utcOffset: 0});
    job.start();
    logger.info(`started fiserv transaction exporter, crontab: ${crontab}`);
  }

  public async exportTxns() {
    const delay = () => sleep(500);
    this.logger.info('starting transactions export');
    const loginRes = await this.api.StartLogin();
    const secQuesRes = await this.api.StartSecurityQuestion({
      sc: loginRes.sc, // E.g., a cookie with value "241071212_1"
      pm: loginRes.pm, // E.g., a cookie with value "PMV6NsEwZj3roiOxdeU...RXllgig%253D%253D"
      pb: loginRes.pb, // E.g., a cookie wtih value "CfDJ8MUmt6vrn61EpJ...m8QuhLZIBX"
      ts: loginRes.ts, // E.g., a cookie with value "01bc9608897ea46bc8...fdf77cc1297ef"
      redirectToken: loginRes.redirectToken, // E.g., "j7xwww5NabClwoV...Fz6LxIYjdM60Gq1g%3D"
    });
    await delay();
    const answer = this.secAnsReg.getAnswer(secQuesRes.question);
    await delay();
    const secAnsRes = await this.api.SendSecurityAnswer({
      referer: secQuesRes.refererNext,
      rv: secQuesRes.rv, // E.g., a cookie with value "CfDJ8MUmt6vrn61EpJ_-Ql3W...ZGVxJVTJqXag"
      pb: loginRes.pb, // E.g., a cookie with value "CfDJ8MUmt6vrn61EpJ/+Ql3Wqs...N+bmz9dTSm8QuhLZIBX"
      pm: secQuesRes.pm, // E.g., a cookie with value "PMV6NsdWh4Ww%2Fb6x68...vReYOa8OJZVVQ%3D%3D"
      sc: loginRes.sc, // E.g., a cookie with value "241071212_1"
      ts: secQuesRes.ts, // E.g., a cookie with value "01bc960889576ad6096d...f7c2f2cc186"
      redirectToken: loginRes.redirectToken, // E.g., "j7xwww5NabClwoV...Fz6LxIYjdM60Gq1g%3D"
      rvBody: secQuesRes.antiForgeryToken, // E.g., "CfDJ8MUmt6vrn61EpJ_-Ql3W...XcOnfrX5dhxM"
      answer, // The plaintext answer to the security question
    });
    await delay();
    const homeRes = await this.api.GetHome({
      referer: secAnsRes.refererNext,
      redirectToken: secAnsRes.redirectToken,
      rv: secQuesRes.rv, // E.g., a cookie with value "CfDJ8MUmt6vrn61EpJ_-Ql3...cqW6RoGCzq2ZGVxJVTJqXag"
      auth: secAnsRes.auth, // E.g., a cookie with value "jZbwtIG9pY6pX6PE+cCaVs...zqUabeUUed3uybgSeaiCg="
      pb: loginRes.pb, // E.g., a cookie with value "CfDJ8MUmt6vrn61EpJ/+Ql3WqsP...mz9dTSm8QuhLZIBX"
      pm: secAnsRes.pm, // E.g., a cookie with value "PMV6NsWZSeGW4f...4e2c67NNVg1z3X0H9C7%2FpoExgDs9w%3D%3D"
      sc: loginRes.sc, // E.g., a cookie with value "241071212_1"
      ts: secAnsRes.ts, // E.g., a cookie with value "01bc960889e35787...b3bf7b89aa4427"
    });
    await delay();
    const accountListRes = await this.api.GetAccountList({
      referer: homeRes.refererNext,
      urlToken: homeRes.pageNonce, // E.g., "ztYuL3h+9Mwh0imVnhtN41Y5TRCJX9...UXmVoWzoFMOa+kSwzpLAamdFX7X/E="
      redirectToken: secAnsRes.redirectToken,
      rv: secQuesRes.rv, // E.g., a cookie with value "CfDJ8MUmt6vrn61EpJ_-Ql3...cqW6RoGCzq2ZGVxJVTJqXag"
      auth: secAnsRes.auth, // E.g., a cookie with value "jZbwtIG9pY6pX6PE+cCaVs...zqUabeUUed3uybgSeaiCg="
      pb: loginRes.pb, // E.g., a cookie with value "CfDJ8MUmt6vrn61EpJ/+Ql3WqsP...mz9dTSm8QuhLZIBX"
      pm: secAnsRes.pm, // E.g., a cookie with value "PMV6NsWZSeGW4f...4e2c67NNVg1z3X0H9C7%2FpoExgDs9w%3D%3D"
      sc: loginRes.sc, // E.g., a cookie with value "241071212_1"
      ts: secAnsRes.ts, // E.g., a cookie with value "01bc960889e35787...b3bf7b89aa4427"
    });
    await delay();

    const accounts = accountListRes.data;
    this.logger.info(`retrieved ${accounts.length} account(s)`);
    const csvPromises = accounts.map(a =>
      CSVExporter.exportAccount(this.logger, a)
    );
    this.logger.info(`attempting to export ${accounts.length} accounts`);
    await Promise.all(csvPromises);

    for (let i = 0; i < accountListRes.data.length; i++) {
      const acct = accountListRes.data[i];
      this.logger.info(`retrieving transactions for account ${acct.name}`);
      const {accountId} = acct;
      const txns = await this.getTransactionsForAccount({
        accountId,
        accountName: acct.name,
        loginRes,
        secQuesRes,
        secAnsRes,
        homeRes,
        accountListRes,
      });
      this.logger.info(
        `retrieved ${txns.length} total transaction(s) for account ${acct.name}`
      );
      this.logger.info(`exporting transactions for account ${acct.name}`);
      await CSVExporter.exportTxns(this.logger, acct.name, txns);
    }
  }

  private async getTransactionsForAccount(p: {
    accountId: string;
    accountName: string;
    loginRes: LoginRes;
    secQuesRes: SecurityQuestionRes;
    secAnsRes: SecurityAnswerRes;
    homeRes: HomeRes;
    accountListRes: AccountListRes;
  }) {
    let txns: Transaction[] = [];
    let hasMoreTxns = true;
    const reqCount = 0;
    while (hasMoreTxns) {
      this.logger.info(
        `retrieving transactions, account name: ${p.accountName}, sent ${reqCount} prior txn request(s)`
      );
      const txnRes = await this.api.GetTransactions({
        getMore: txns.length !== 0,
        referer: p.accountListRes.refererNext,
        urlToken: p.homeRes.pageNonce,
        accountId: p.accountId,
        rv: p.secQuesRes.rv,
        auth: p.secAnsRes.auth,
        pb: p.loginRes.pb,
        pm: p.secAnsRes.pm,
        sc: p.loginRes.sc,
        ts: p.secAnsRes.ts,
      });
      const newTxnData = txnRes.data;
      if (newTxnData.isSuccessful !== true) break;
      txns = txns.concat(newTxnData.transactions);
      this.logger.info(
        `retrieved ${newTxnData.transactions.length} transaction(s)`
      );
      hasMoreTxns = newTxnData.hasMore === true;
      if (!hasMoreTxns) break;
      await sleep(1000);
    }
    return txns;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

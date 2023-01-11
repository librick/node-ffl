import {createObjectCsvWriter} from 'csv-writer';
import fs from 'fs';
import {Logger} from 'winston';
import {Account} from '../schemas/AccountSchemas';
import {Transaction} from '../FiservApi';

export class CSVExporter {
  public static async exportAccount(logger: Logger, account: Account) {
    logger.info('attempting to export account info to csv');
    const outputDir = createDirIfNotExists(`${process.cwd()}/output`);
    const outputPath = buildOutputPath(outputDir, 'account', account.name);
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        {id: 'name', title: 'name'},
        {id: 'balanceAmount', title: 'balanceAmount'},
        {id: 'balanceDescription', title: 'balanceDescription'},
        {id: 'type', title: 'type'},
        {id: 'number', title: 'number'},
        {id: 'unformattedBalanceAmount', title: 'unformattedBalanceAmount'},
      ],
    });
    await csvWriter.writeRecords([
      {
        name: account.name,
        balanceAmount: account.balanceAmount,
        balanceDescription: account.balanceDescription,
        type: account.type,
        number: account.number,
        unformattedBalanceAmount: account.unformattedBalanceAmount,
      },
    ]);
    logger.info(`wrote account record to ${outputPath}`);
  }

  public static async exportTxns(
    logger: Logger,
    accountName: string,
    txns: Transaction[]
  ) {
    logger.info('attempting to export transaction info to csv');
    const outputDir = createDirIfNotExists(`${process.cwd()}/output`);
    const outputPath = buildOutputPath(outputDir, 'txns', accountName);
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: [
        {id: 'amount', title: 'amount'},
        {id: 'balance', title: 'balance'},
        {id: 'creditDebitIndicator', title: 'creditDebitIndicator'},
        {id: 'description', title: 'description'},
        {id: 'tranDate', title: 'tranDate'},
      ],
    });
    const csvRecords = txns.map(x => ({
      amount: x.amount,
      balance: x.balance ?? undefined,
      creditDebitIndicator: x.creditDebitIndicator,
      description: x.description.replace(/\s+/g, ' '),
      tranDate: x.tranDate,
    }));
    await csvWriter.writeRecords(csvRecords);
    logger.info(`wrote ${csvRecords.length} record(s) to ${outputPath}`);
  }
}

function buildOutputPath(dir: string, label: string, accountName: string) {
  const datetimeStr = new Date(Date.now()).toISOString();
  const nameStr = accountName.replace(/\s+/g, '_').toLowerCase();
  return `${dir}/${datetimeStr}-${label}-${nameStr}.csv`;
}

function createDirIfNotExists(dir: string): string {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
  return dir;
}

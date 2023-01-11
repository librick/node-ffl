import {SecurityQuestion} from './SecurityAnswerRegistry';

const MAX_LEN = 1048576; // 2**20

export class HtmlParser {
  public static looksLikeHtml(html: string): boolean {
    // We don't really care about DOM structure.
    // In liue of a parsing library, just rely on weak substring checks
    return html.trimStart().startsWith('<!DOCTYPE html>');
  }

  public static parseAntiForgeryToken(html: string) {
    if (html.length > MAX_LEN)
      throw new Error('failed to parse anti-forgery token, string too long');
    const line = html
      .split('\n')
      .find(x => x.includes('PBI.antiForgeryToken = "'));
    if (line === undefined)
      throw new Error(
        'failed to parse anti-forgery token, no such line in provided markup'
      );
    const regex = /"[A-Za-z0-9_-]+"/g;
    const found = line.match(regex);
    if (found === null || found.length !== 1) {
      throw new Error(
        'failed to parse anti-forgery token, regex yielded non-1 match'
      );
    }
    const antiForgeryToken = found[0].replace(/"/g, '');
    return antiForgeryToken;
  }

  public static parsePageNonce(html: string) {
    if (html.length > MAX_LEN)
      throw new Error('failed to parse anti-forgery token, string too long');
    const line = html.split('\n').find(x => x.includes('PBI.pageNonce = "'));
    if (line === undefined)
      throw new Error(
        'failed to parse page nonce, no such line in provided markup'
      );
    const regex = /"[A-Za-z0-9/+=]+"/g;
    const found = line.match(regex);
    if (found === null || found.length !== 1) {
      throw new Error('failed to parse page nonce, regex yielded non-1 match');
    }
    const pageNonce = found[0].replace(/"/g, '');
    return pageNonce;
  }

  public static parseSecurityQuestion(html: string): SecurityQuestion {
    if (html.length > MAX_LEN)
      throw new Error('failed to parse anti-forgery token, string too long');
    if (html.includes('What is your favorite sports team?'))
      return SecurityQuestion.SPORT;
    if (html.includes('What is the name of your first employer?'))
      return SecurityQuestion.EMPLOYER;
    if (html.includes('What was the model of your first car?'))
      return SecurityQuestion.CAR;
    throw new Error(
      'failed to parse security question from provided html, no valid substring found'
    );
  }
}

import {Cookie} from 'tough-cookie';

export class CookieFactory {
  public static getBannerDisplayIndexCookie() {
    return new Cookie({key: 'BannerDisplayIndex', value: '0'});
  }
}

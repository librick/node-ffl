// See: https://firstmutualholding.com/Affiliates
export enum Institution {
  FIRST_FEDERAL_LAKEWOOD = 1,
  BLUE_GRASS_FEDERAL,
  FIRST_MUTUAL_BANK,
  MARTINSVILLE_FIRST_SAVINGS_BANK,
  WARSAW_FEDERAL,
}

export const InstitutionUrls: Record<Institution, string> = {
  [Institution.FIRST_FEDERAL_LAKEWOOD]: 'https://www.ffl.net',
  [Institution.BLUE_GRASS_FEDERAL]: 'https://www.bluegrassfederal.com',
  [Institution.FIRST_MUTUAL_BANK]: 'https://www.1stmutualbank.com',
  [Institution.MARTINSVILLE_FIRST_SAVINGS_BANK]:
    'https://www.martinsvillefirst.com',
  [Institution.WARSAW_FEDERAL]: 'https://www.warsawfederal.com',
};

export const InstitutionRoutingNumbers: Record<Institution, string> = {
  [Institution.FIRST_FEDERAL_LAKEWOOD]: '241071212',
  [Institution.BLUE_GRASS_FEDERAL]: '242170549',
  [Institution.FIRST_MUTUAL_BANK]: '244270191',
  [Institution.MARTINSVILLE_FIRST_SAVINGS_BANK]: '251472759',
  [Institution.WARSAW_FEDERAL]: '242071855',
};

export const InstitutionNames: Record<Institution, string> = {
  [Institution.BLUE_GRASS_FEDERAL]: 'Blue Grass Federal',
  [Institution.FIRST_FEDERAL_LAKEWOOD]: 'First Federal Lakewood',
  [Institution.FIRST_MUTUAL_BANK]: 'First Mutual Bank',
  [Institution.MARTINSVILLE_FIRST_SAVINGS_BANK]:
    'Martinsville First Savings Bank',
  [Institution.WARSAW_FEDERAL]: 'Warsaw Federal',
};

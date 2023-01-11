import {z} from 'zod';

const AccountSchema = z.object({
  accountId: z.string(),
  balanceAmount: z.string(),
  balanceDescription: z.string(),
  canChangeNickname: z.boolean(),
  canHaveTransactions: z.boolean(),
  canViewTransactions: z.boolean(),
  name: z.string(),
  type: z.number(),
  number: z.string(),
  isHidden: z.boolean(),
  canTransfer: z.boolean(),
  unformattedBalanceAmount: z.number(),
});
export type Account = z.infer<typeof AccountSchema>;
export const AccountCollectionSchema = z.array(AccountSchema);

import {z} from 'zod';

export const TransactionSchema = z.object({
  amount: z.string(),
  balance: z.string().nullable(),
  creditDebitIndicator: z.union([z.literal('debit'), z.literal('credit')]),
  description: z.string(),
  tranDate: z.string(),
  postingStatus: z.string(),
  transactionId: z.string(),
  hasImage: z.boolean(),
  unformattedBalance: z.string().nullable(),
});
export const TransactionCollectionSchema = z.object({
  hasMore: z.boolean(),
  archivedTransactionsErrored: z.boolean(),
  transactions: z.array(TransactionSchema),
  isSuccessful: z.boolean(),
});

export type TransactionType =
  | 'BET_PLACED'
  | 'BET_WON'
  | 'BET_LOST'
  | 'DEPOSIT'
  | 'WITHDRAWAL';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  betId: string | null;
  createdAt: Date;
}

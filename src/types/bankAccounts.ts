import type { BankAccount, BankAccountAccess, BankAccountWeek, BankTransaction, TransactionType, BankAccountAccessType } from '@prisma/client';

export interface BankAccountWithRelations extends BankAccount {
  owner: {
    id: string;
    name: string;
    email: string;
  };
  accesses: (BankAccountAccess & {
    user: {
      id: string;
      name: string;
      email: string;
    };
  })[];
}

export interface BankAccountWeekWithTransactions extends BankAccountWeek {
  transactions: BankTransaction[];
  account: {
    id: string;
    name: string;
  };
}

export interface BankTransactionWithWeek extends BankTransaction {
  week: {
    id: string;
    weekStart: Date;
    weekEnd: Date;
    accountId: string;
  };
}

export type { TransactionType, BankAccountAccessType };

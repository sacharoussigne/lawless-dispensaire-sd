import prisma from '@/lib/prisma';
import { getBankWeekBounds } from '@/lib/bankWeek';

export function getWeekBounds(date: Date) {
  return getBankWeekBounds(date);
}

/**
 * Checks if the user has access to the account (owner or access)
 */
export async function checkAccountAccess(accountId: string, userId: string, requireWrite: boolean = false) {
  const account = await prisma.bankAccount.findUnique({
    where: { id: accountId },
    include: {
      accesses: {
        where: { userId },
      },
    },
  });

  if (!account) {
    return { hasAccess: false, error: 'Compte introuvable' };
  }

  // Owner always has access
  if (account.ownerId === userId) {
    return { hasAccess: true };
  }

  // Check access
  const access = account.accesses[0];
  if (!access) {
    return { hasAccess: false, error: 'Accès non autorisé' };
  }

  if (requireWrite && access.accessType !== 'WRITE') {
    return { hasAccess: false, error: 'Accès en écriture requis' };
  }

  return { hasAccess: true };
}

export async function recalculateWeekBalance(weekId: string) {
  const week = await prisma.bankAccountWeek.findUnique({
    where: { id: weekId },
    include: {
      transactions: {
        orderBy: [
          { order: 'asc' },
          { date: 'asc' },
        ],
      },
    },
  });

  if (!week) return;

  // Get previous week balance
  const previousWeek = await prisma.bankAccountWeek.findFirst({
    where: {
      accountId: week.accountId,
      weekStart: {
        lt: week.weekStart,
      },
    },
    orderBy: {
      weekStart: 'desc',
    },
  });

  let balance = previousWeek ? Number(previousWeek.balance) : 0;

  // Compute balance from transactions by type
  for (const transaction of week.transactions) {
    const amount = Number(transaction.amount);
    if (transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN') {
      balance += amount;
    } else {
      // WITHDRAWAL or TRANSFER_OUT
      balance -= amount;
    }
  }

  // Persist week balance
  await prisma.bankAccountWeek.update({
    where: { id: weekId },
    data: {
      balance,
    },
  });

  // Recompute following weeks (each depends on the previous week's closing balance)
  const followingWeeks = await prisma.bankAccountWeek.findMany({
    where: {
      accountId: week.accountId,
      weekStart: {
        gt: week.weekStart,
      },
    },
    orderBy: {
      weekStart: 'asc',
    },
    include: {
      transactions: {
        orderBy: [
          { order: 'asc' },
          { date: 'asc' },
        ],
      },
    },
  });

  // Walk weeks in order and propagate balances
  let currentBalance = balance;
  for (const followingWeek of followingWeeks) {
    // Opening balance for this week is the previous week's closing balance
    let weekBalance = currentBalance;

    // Compute balance from transactions by type
    for (const transaction of followingWeek.transactions) {
      const amount = Number(transaction.amount);
      if (transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN') {
        weekBalance += amount;
      } else {
        // WITHDRAWAL or TRANSFER_OUT
        weekBalance -= amount;
      }
    }

    // Persist week balance
    await prisma.bankAccountWeek.update({
      where: { id: followingWeek.id },
      data: {
        balance: weekBalance,
      },
    });

    // Closing balance seeds the next iteration
    currentBalance = weekBalance;
  }
}
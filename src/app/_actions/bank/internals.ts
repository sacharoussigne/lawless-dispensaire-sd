import prisma from '@/lib/prisma';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import { getBankWeekBounds } from '@/lib/bankWeek';

export function getWeekBounds(date: Date) {
  return getBankWeekBounds(date);
}

export async function checkAccountAccess(
  dispensaryId: string,
  accountId: string,
  userId: string,
  requireWrite: boolean = false,
) {
  const account = await prisma.bankAccount.findFirst({
    where: { id: accountId, ...tenantWhere(dispensaryId) },
    include: {
      accesses: {
        where: { userId },
      },
    },
  });

  if (!account) {
    return { hasAccess: false, error: 'Compte introuvable' };
  }

  if (account.ownerId === userId) {
    return { hasAccess: true };
  }

  const access = account.accesses[0];
  if (!access) {
    return { hasAccess: false, error: 'Accès non autorisé' };
  }

  if (requireWrite && access.accessType !== 'WRITE') {
    return { hasAccess: false, error: 'Accès en écriture requis' };
  }

  return { hasAccess: true };
}

export async function recalculateWeekBalance(dispensaryId: string, weekId: string) {
  const week = await prisma.bankAccountWeek.findFirst({
    where: {
      id: weekId,
      account: tenantWhere(dispensaryId),
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

  if (!week) return;

  const previousWeek = await prisma.bankAccountWeek.findFirst({
    where: {
      accountId: week.accountId,
      account: tenantWhere(dispensaryId),
      weekStart: {
        lt: week.weekStart,
      },
    },
    orderBy: {
      weekStart: 'desc',
    },
  });

  let balance = previousWeek ? Number(previousWeek.balance) : 0;

  for (const transaction of week.transactions) {
    const amount = Number(transaction.amount);
    if (transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN') {
      balance += amount;
    } else {
      balance -= amount;
    }
  }

  await prisma.bankAccountWeek.update({
    where: { id: weekId },
    data: {
      balance,
    },
  });

  const followingWeeks = await prisma.bankAccountWeek.findMany({
    where: {
      accountId: week.accountId,
      account: tenantWhere(dispensaryId),
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

  let currentBalance = balance;
  for (const followingWeek of followingWeeks) {
    let weekBalance = currentBalance;

    for (const transaction of followingWeek.transactions) {
      const amount = Number(transaction.amount);
      if (transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN') {
        weekBalance += amount;
      } else {
        weekBalance -= amount;
      }
    }

    await prisma.bankAccountWeek.update({
      where: { id: followingWeek.id },
      data: {
        balance: weekBalance,
      },
    });

    currentBalance = weekBalance;
  }
}

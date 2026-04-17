'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { getAuthSession } from '@/lib/auth';
import { getAppFeatureActionBlock } from '@/lib/appSettings';

import { checkAccountAccess, getWeekBounds } from '@/app/_actions/bank/internals';

export async function getOrCreateWeek(accountId: string, date: Date) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

    const accessCheck = await checkAccountAccess(accountId, session.user.id);
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès non autorisé',
      };
    }

    const { start, end } = getWeekBounds(date);

    // Range lookup: weekStart must fall in the Paris calendar week [start, end].
    // Older rows may use a different instant for "Monday" (e.g. UTC startOfWeek) but still lie in this window.
    let week = await prisma.bankAccountWeek.findFirst({
      where: {
        accountId,
        weekStart: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { weekStart: 'asc' },
      include: {
        transactions: {
          orderBy: [
            { order: 'asc' },
            { date: 'asc' },
          ],
        },
      },
    });

    // If it doesn't exist, create it
    if (!week) {
      // Get previous week balance
      const previousWeek = await prisma.bankAccountWeek.findFirst({
        where: {
          accountId,
          weekStart: {
            lt: start,
          },
        },
        orderBy: {
          weekStart: 'desc',
        },
      });

      week = await prisma.bankAccountWeek.create({
        data: {
          accountId,
          weekStart: start,
          weekEnd: end,
          balance: previousWeek ? previousWeek.balance : 0,
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
    }

    const serializedWeek = {
      ...week,
      balance: Number(week.balance),
      transactions: week.transactions.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
      })),
    };

    return {
      status: 200,
      data: serializedWeek,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération de la semaine');
  }
}

/**
 * Gets all weeks of an account
 */
export async function getAccountWeeks(accountId: string) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return {
        status: 401,
        error: 'Non autorisé',
      };
    }

    const bankFeatureBlock = await getAppFeatureActionBlock('bank');
    if (bankFeatureBlock) return bankFeatureBlock;

    const accessCheck = await checkAccountAccess(accountId, session.user.id);
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès non autorisé',
      };
    }

    const weeks = await prisma.bankAccountWeek.findMany({
      where: { accountId },
      orderBy: {
        weekStart: 'desc',
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

    const serializedWeeks = weeks.map((week) => ({
      ...week,
      balance: Number(week.balance),
      transactions: week.transactions.map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
      })),
    }));

    return {
      status: 200,
      data: serializedWeeks,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des semaines');
  }
}

/**
 * Creates a transaction
 */

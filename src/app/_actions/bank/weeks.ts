'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

import { checkAccountAccess, getWeekBounds } from '@/app/_actions/bank/internals';

export async function getOrCreateWeek(
  dispensarySlug: string,
  accountId: string,
  date: Date,
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'bank',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;
    const { session } = ctx;

    const accessCheck = await checkAccountAccess(dispensaryId, accountId, session.user.id);
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès non autorisé',
      };
    }

    const { start, end } = getWeekBounds(date);

    let week = await prisma.bankAccountWeek.findFirst({
      where: {
        accountId,
        account: tenantWhere(dispensaryId),
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

    if (!week) {
      const previousWeek = await prisma.bankAccountWeek.findFirst({
        where: {
          accountId,
          account: tenantWhere(dispensaryId),
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

export async function getAccountWeeks(dispensarySlug: string, accountId: string) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'bank',
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;
    const { session } = ctx;

    const accessCheck = await checkAccountAccess(dispensaryId, accountId, session.user.id);
    if (!accessCheck.hasAccess) {
      return {
        status: 403,
        error: accessCheck.error || 'Accès non autorisé',
      };
    }

    const weeks = await prisma.bankAccountWeek.findMany({
      where: {
        accountId,
        account: tenantWhere(dispensaryId),
      },
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

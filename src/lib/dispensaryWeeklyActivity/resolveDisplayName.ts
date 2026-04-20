import type { PrismaClient } from '@prisma/client';
import { DISCORD_ACCOUNT_PROVIDER_ID } from '@/lib/dispensaryWeeklyActivity/constants';

type AccountDelegate = Pick<PrismaClient, 'account'>;

/** Default `displayName` when the Discord bot auto-creates a weekly activity row. */
export async function resolveBotWeeklyActivityDisplayName(
  prisma: AccountDelegate,
  discordUserId: string,
): Promise<string> {
  const acc = await prisma.account.findFirst({
    where: {
      providerId: DISCORD_ACCOUNT_PROVIDER_ID,
      accountId: discordUserId,
    },
    include: { user: { select: { name: true } } },
  });
  const name = acc?.user?.name?.trim();
  if (name && name.length > 0) {
    return name.length > 200 ? name.slice(0, 200) : name;
  }
  const fallback = `Médecin ${discordUserId}`;
  return fallback.length > 200 ? fallback.slice(0, 200) : fallback;
}

export async function findLinkedUserIdByDiscordAccount(
  prisma: AccountDelegate,
  discordUserId: string,
): Promise<string | null> {
  const acc = await prisma.account.findFirst({
    where: {
      providerId: DISCORD_ACCOUNT_PROVIDER_ID,
      accountId: discordUserId,
    },
    select: { userId: true },
  });
  return acc?.userId ?? null;
}

export async function getDiscordAccountIdForUser(
  prisma: AccountDelegate,
  userId: string,
): Promise<string | null> {
  const acc = await prisma.account.findFirst({
    where: {
      userId,
      providerId: DISCORD_ACCOUNT_PROVIDER_ID,
    },
    select: { accountId: true },
  });
  return acc?.accountId ?? null;
}

type RowWithUser = {
  id: string;
  displayName: string;
  discordUserId: string;
  userId: string | null;
  user?: { name: string } | null;
};

export async function mergeResolvedDisplayNames<T extends RowWithUser>(
  prisma: AccountDelegate,
  rows: T[],
): Promise<(T & { resolvedDisplayName: string })[]> {
  if (rows.length === 0) return [];

  const needLookup = rows.filter((r) => !r.user?.name);
  const discordIds = [...new Set(needLookup.map((r) => r.discordUserId))];
  let discordToName = new Map<string, string>();
  if (discordIds.length > 0) {
    const accounts = await prisma.account.findMany({
      where: {
        providerId: DISCORD_ACCOUNT_PROVIDER_ID,
        accountId: { in: discordIds },
      },
      include: { user: { select: { name: true } } },
    });
    discordToName = new Map(accounts.map((a) => [a.accountId, a.user.name]));
  }

  return rows.map((r) => ({
    ...r,
    resolvedDisplayName: r.user?.name ?? discordToName.get(r.discordUserId) ?? r.displayName,
  }));
}

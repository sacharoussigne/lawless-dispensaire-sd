import type { PrismaClient } from '@prisma/client';
import { DISCORD_ACCOUNT_PROVIDER_ID } from '@/lib/dispensaryWeeklyActivity/constants';

type AccountDelegate = Pick<PrismaClient, 'account'>;
type WeeklyActivityDelegate = Pick<PrismaClient, 'dispensaryWeeklyActivity'>;
type ResolveDisplayNameDelegate = AccountDelegate & WeeklyActivityDelegate;

export function genericDoctorFallbackName(discordUserId: string): string {
  const fallback = `Médecin ${discordUserId}`;
  return fallback.length > 200 ? fallback.slice(0, 200) : fallback;
}

function isGenericDoctorFallbackName(displayName: string, discordUserId: string): boolean {
  const trimmed = displayName.trim();
  return trimmed.length === 0 || trimmed === genericDoctorFallbackName(discordUserId);
}

function trimDisplayName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 200 ? trimmed.slice(0, 200) : trimmed;
}

export async function getLatestDiscordDisplayName(
  prisma: WeeklyActivityDelegate,
  discordUserId: string,
): Promise<string | null> {
  const row = await prisma.dispensaryWeeklyActivity.findFirst({
    where: { discordUserId },
    orderBy: { updatedAt: 'desc' },
    select: { displayName: true },
  });
  const name = row?.displayName?.trim();
  if (!name || isGenericDoctorFallbackName(name, discordUserId)) {
    return null;
  }
  return trimDisplayName(name);
}

export async function getLatestDiscordDisplayNames(
  prisma: WeeklyActivityDelegate,
  discordUserIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(discordUserIds)];
  if (unique.length === 0) return new Map();

  const rows = await prisma.dispensaryWeeklyActivity.findMany({
    where: { discordUserId: { in: unique } },
    orderBy: { updatedAt: 'desc' },
    select: { discordUserId: true, displayName: true },
  });

  const map = new Map<string, string>();
  for (const row of rows) {
    if (map.has(row.discordUserId)) continue;
    const name = row.displayName?.trim();
    if (!name || isGenericDoctorFallbackName(name, row.discordUserId)) continue;
    map.set(row.discordUserId, trimDisplayName(name));
  }
  return map;
}

export async function resolveDiscordDisplayName(
  prisma: ResolveDisplayNameDelegate,
  discordUserId: string,
): Promise<string> {
  const latest = await getLatestDiscordDisplayName(prisma, discordUserId);
  if (latest) return latest;
  return genericDoctorFallbackName(discordUserId);
}

/** Default `displayName` when the Discord bot auto-creates a weekly activity row. */
export async function resolveBotWeeklyActivityDisplayName(
  prisma: ResolveDisplayNameDelegate,
  discordUserId: string,
): Promise<string> {
  return resolveDiscordDisplayName(prisma, discordUserId);
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

type RowWithDisplayName = {
  displayName: string;
  discordUserId: string;
};

export async function mergeResolvedDisplayNames<T extends RowWithDisplayName>(
  prisma: WeeklyActivityDelegate,
  rows: T[],
): Promise<(T & { resolvedDisplayName: string })[]> {
  if (rows.length === 0) return [];

  const needLookup = rows.filter((r) => isGenericDoctorFallbackName(r.displayName, r.discordUserId));
  const discordIds = [...new Set(needLookup.map((r) => r.discordUserId))];
  const latestByDiscord = await getLatestDiscordDisplayNames(prisma, discordIds);

  return rows.map((r) => {
    const stored = trimDisplayName(r.displayName);
    if (!isGenericDoctorFallbackName(stored, r.discordUserId)) {
      return { ...r, resolvedDisplayName: stored };
    }
    const latest = latestByDiscord.get(r.discordUserId);
    return {
      ...r,
      resolvedDisplayName: latest ?? genericDoctorFallbackName(r.discordUserId),
    };
  });
}

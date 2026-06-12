import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  genericDoctorFallbackName,
  getLatestDiscordDisplayNames,
  mergeResolvedDisplayNames,
  resolveBotWeeklyActivityDisplayName,
} from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';

function mockPrisma(displayNamesByDiscordId: Record<string, string[]>) {
  const flatRows = Object.entries(displayNamesByDiscordId).flatMap(([discordUserId, names]) =>
    names.map((displayName, index) => ({
      discordUserId,
      displayName,
      updatedAt: new Date(Date.now() - index * 1000),
    })),
  );

  return {
    dispensaryWeeklyActivity: {
      findFirst: vi.fn(async ({ where }: { where: { discordUserId: string } }) => {
        const names = displayNamesByDiscordId[where.discordUserId] ?? [];
        const displayName = names[0];
        return displayName ? { displayName } : null;
      }),
      findMany: vi.fn(
        async ({
          where,
        }: {
          where: { discordUserId: { in: string[] } };
        }) => {
          const ids = new Set(where.discordUserId.in);
          return flatRows
            .filter((r) => ids.has(r.discordUserId))
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        },
      ),
    },
    account: {
      findFirst: vi.fn(),
    },
  } as unknown as Pick<PrismaClient, 'dispensaryWeeklyActivity' | 'account'>;
}

describe('getLatestDiscordDisplayNames', () => {
  it('returns the most recently updated display name per discord user in one batch', async () => {
    const discordUserId = '456';
    const prisma = mockPrisma({
      [discordUserId]: ['LatestDiscordName', 'OlderName'],
    });

    const map = await getLatestDiscordDisplayNames(prisma, [discordUserId, discordUserId]);

    expect(map.get(discordUserId)).toBe('LatestDiscordName');
    expect(prisma.dispensaryWeeklyActivity.findMany).toHaveBeenCalledTimes(1);
  });

  it('skips generic fallback display names', async () => {
    const discordUserId = '111';
    const prisma = mockPrisma({
      [discordUserId]: [genericDoctorFallbackName(discordUserId)],
    });

    const map = await getLatestDiscordDisplayNames(prisma, [discordUserId]);

    expect(map.has(discordUserId)).toBe(false);
  });
});

describe('mergeResolvedDisplayNames', () => {
  it('uses stored displayName even when a linked intranet user name differs', async () => {
    const prisma = mockPrisma({});
    const rows = [
      {
        displayName: 'DrDiscord',
        discordUserId: '123',
        userId: 'user-1',
        user: { name: 'IntranetName' },
      },
    ];

    const out = await mergeResolvedDisplayNames(prisma, rows);

    expect(out[0].resolvedDisplayName).toBe('DrDiscord');
  });

  it('falls back to the latest known discord display name for generic stored values', async () => {
    const discordUserId = '456';
    const prisma = mockPrisma({
      [discordUserId]: ['LatestDiscordName', 'OlderName'],
    });
    const rows = [
      {
        displayName: genericDoctorFallbackName(discordUserId),
        discordUserId,
        userId: null,
      },
    ];

    const out = await mergeResolvedDisplayNames(prisma, rows);

    expect(out[0].resolvedDisplayName).toBe('LatestDiscordName');
  });
});

describe('resolveBotWeeklyActivityDisplayName', () => {
  it('returns the latest known discord display name', async () => {
    const discordUserId = '789';
    const prisma = mockPrisma({
      [discordUserId]: ['BotPseudo'],
    });

    await expect(resolveBotWeeklyActivityDisplayName(prisma, discordUserId)).resolves.toBe(
      'BotPseudo',
    );
  });

  it('falls back to a generic doctor label when no discord name exists', async () => {
    const discordUserId = '999';
    const prisma = mockPrisma({});

    await expect(resolveBotWeeklyActivityDisplayName(prisma, discordUserId)).resolves.toBe(
      genericDoctorFallbackName(discordUserId),
    );
  });
});

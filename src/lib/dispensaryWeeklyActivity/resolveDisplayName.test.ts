import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  genericDoctorFallbackName,
  mergeResolvedDisplayNames,
  resolveBotWeeklyActivityDisplayName,
} from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';

function mockPrisma(displayNamesByDiscordId: Record<string, string[]>) {
  return {
    dispensaryWeeklyActivity: {
      findFirst: vi.fn(async ({ where }: { where: { discordUserId: string } }) => {
        const names = displayNamesByDiscordId[where.discordUserId] ?? [];
        const displayName = names[0];
        return displayName ? { displayName } : null;
      }),
    },
    account: {
      findFirst: vi.fn(),
    },
  } as unknown as Pick<PrismaClient, 'dispensaryWeeklyActivity' | 'account'>;
}

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

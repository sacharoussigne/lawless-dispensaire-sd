import type { DispensaryWeeklyActivity } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { checkRolePermission } from '@/lib/auth/permissions';
import { DISCORD_ACCOUNT_PROVIDER_ID } from '@/lib/dispensaryWeeklyActivity/constants';

export function canViewWeeklyDispensaryActivity(role: string | null | undefined): boolean {
  return checkRolePermission(role, 'weekly_dispensary_activity', 'view');
}

export function canEditAllWeeklyDispensaryActivity(role: string | null | undefined): boolean {
  return checkRolePermission(role, 'weekly_dispensary_activity', 'edit_all');
}

export function canEditOwnWeeklyDispensaryActivity(role: string | null | undefined): boolean {
  return checkRolePermission(role, 'weekly_dispensary_activity', 'edit_own');
}

export async function isWeeklyActivityOwner(
  prisma: Pick<PrismaClient, 'account'>,
  sessionUserId: string,
  activity: Pick<DispensaryWeeklyActivity, 'userId' | 'discordUserId'>,
): Promise<boolean> {
  if (activity.userId && activity.userId === sessionUserId) {
    return true;
  }
  const link = await prisma.account.findFirst({
    where: {
      userId: sessionUserId,
      providerId: DISCORD_ACCOUNT_PROVIDER_ID,
      accountId: activity.discordUserId,
    },
    select: { id: true },
  });
  return !!link;
}

export async function canEditWeeklyActivity(
  prisma: Pick<PrismaClient, 'account'>,
  sessionUserId: string,
  userRole: string | null | undefined,
  activity: DispensaryWeeklyActivity,
): Promise<boolean> {
  if (canEditAllWeeklyDispensaryActivity(userRole)) return true;
  if (!canEditOwnWeeklyDispensaryActivity(userRole)) return false;
  return isWeeklyActivityOwner(prisma, sessionUserId, activity);
}

import { listDispensaryWeeklyActivities } from '@/app/_actions/dispensaryWeeklyActivity';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';
import { getBankWeekBounds } from '@/lib/bankWeek';
import dayjs from '@/lib/dayjs';
import {
  getDiscordAccountIdForUser,
  resolveDiscordDisplayName,
} from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';
import prisma from '@/lib/prisma';
import { getDataOrThrow } from '@/lib/response';
import WeeklyActivityPageClient from './WeeklyActivityPageClient';

async function WeeklyActivityContent({ dispensarySlug }: { dispensarySlug: string }) {
  const session = await getAuthSession();
  if (!session?.user) {
    return null;
  }

  const week = getBankWeekBounds(dayjs().tz('Europe/Paris').startOf('day').toDate());
  const initialWeekBounds = { periodStart: week.start, periodEnd: week.end };

  const [result, viewerDiscordId] = await Promise.all([
    listDispensaryWeeklyActivities(dispensarySlug, initialWeekBounds),
    getDiscordAccountIdForUser(prisma, session.user.id),
  ]);
  const rows = getDataOrThrow(result, 'Erreur lors du chargement de l’activité hebdomadaire');

  const canEditAll = checkRolePermission(session.user.role, 'weekly_dispensary_activity', 'edit_all');
  const canEdit =
    canEditAll ||
    checkRolePermission(session.user.role, 'weekly_dispensary_activity', 'edit_own');

  const defaultDisplayName = viewerDiscordId
    ? await resolveDiscordDisplayName(prisma, viewerDiscordId)
    : session.user.name;

  return (
    <WeeklyActivityPageClient
      initialWeekBounds={initialWeekBounds}
      initialRows={rows}
      canEditAll={canEditAll}
      canEdit={canEdit}
      sessionUserId={session.user.id}
      viewerDiscordId={viewerDiscordId}
      defaultDisplayName={defaultDisplayName}
    />
  );
}

export default async function WeeklyActivityPage({
  params,
}: {
  params: Promise<{ dispensarySlug: string }>;
}) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <WeeklyActivityContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}

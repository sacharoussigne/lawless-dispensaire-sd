import { listDispensaryWeeklyActivities } from '@/app/_actions/dispensaryWeeklyActivity';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import WeeklyActivityPageClient from './WeeklyActivityPageClient';
import { getAuthSession } from '@/lib/auth';
import { checkRolePermission } from '@/lib/auth/permissions';
import { getDiscordAccountIdForUser } from '@/lib/dispensaryWeeklyActivity/resolveDisplayName';
import prisma from '@/lib/prisma';
import { getDataOrThrow } from '@/lib/response';

async function WeeklyActivityContent({ dispensarySlug }: { dispensarySlug: string }) {
  const session = await getAuthSession();
  if (!session?.user) {
    return null;
  }

  const result = await listDispensaryWeeklyActivities(dispensarySlug);
  const rows = getDataOrThrow(result, 'Erreur lors du chargement de l’activité hebdomadaire');

  const canEditAll = checkRolePermission(session.user.role, 'weekly_dispensary_activity', 'edit_all');
  const canEdit =
    canEditAll ||
    checkRolePermission(session.user.role, 'weekly_dispensary_activity', 'edit_own');

  const viewerDiscordId = await getDiscordAccountIdForUser(prisma, session.user.id);

  return (
    <WeeklyActivityPageClient
      initialRows={rows}
      canEditAll={canEditAll}
      canEdit={canEdit}
      sessionUserId={session.user.id}
      viewerDiscordId={viewerDiscordId}
      defaultDisplayName={session.user.name}
    />
  );
}

export default async function WeeklyActivityPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <WeeklyActivityContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}

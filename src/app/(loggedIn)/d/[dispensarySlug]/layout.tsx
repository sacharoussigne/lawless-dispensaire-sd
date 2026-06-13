import Header from '@/app/(loggedIn)/_components/Header/Header';
import { LoggedInShell } from '@/app/(loggedIn)/_components/LoggedInShell/LoggedInShell';
import { getAuthSession } from '@/lib/auth';
import { PermissionsProvider } from '@/app/_contexts/PermissionsContext';
import { calculatePermissions } from '@/lib/auth/calculatePermissions';
import { getAppSettings } from '@/lib/appSettings';
import type { AuthSession } from '@/types/session';
import { getImpersonatorDisplayName } from '@/lib/auth/impersonationDisplay';
import {
  listAccessibleDispensaries,
  requireDispensaryFromSlug,
  getEffectiveRoleForDispensary,
  userCanAccessDispensary,
  resolveDispensaryAccessDeniedRedirect,
} from '@/lib/dispensary/context';
import { notFound, redirect } from 'next/navigation';
import { userHasAnyAgendaAccess, listAccessibleAgendaIds } from '@/lib/agenda/access';
import { DispensaryRealtimeShell } from './DispensaryRealtimeShell';
import { QueryProvider } from '@/lib/react-query/QueryProvider';

export default async function DispensaryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ dispensarySlug: string }>;
}) {
  const { dispensarySlug } = await params;
  const session = await getAuthSession();
  const dispensary = await requireDispensaryFromSlug(dispensarySlug).catch(() => null);

  if (!dispensary) {
    notFound();
  }

  const authSession = session as AuthSession | null;
  const canAccess = await userCanAccessDispensary(authSession, dispensary.id);
  if (!canAccess && session) {
    const target = await resolveDispensaryAccessDeniedRedirect(
      session,
      `/d/${encodeURIComponent(dispensarySlug)}/employee`,
    );
    redirect(target);
  }

  const [
    impersonatorDisplayName,
    effectiveRole,
    appSettings,
    accessibleDispensaries,
  ] = await Promise.all([
    getImpersonatorDisplayName(session?.session?.impersonatedBy),
    getEffectiveRoleForDispensary(authSession, dispensary.id),
    getAppSettings(dispensary.id),
    listAccessibleDispensaries(authSession),
  ]);

  const permissions = calculatePermissions(effectiveRole);
  const userId = session?.user?.id;
  const agendaModuleAccess = userId
    ? await userHasAnyAgendaAccess(
        dispensary.id,
        userId,
        session.user.role,
        effectiveRole,
      )
    : false;
  const accessibleAgendaIds =
    userId && agendaModuleAccess
      ? await listAccessibleAgendaIds(
          dispensary.id,
          userId,
          session.user.role,
          effectiveRole,
        )
      : [];

  return (
    <PermissionsProvider
      initialPermissions={permissions}
      initialRole={effectiveRole}
      initialAppSettings={appSettings}
      dispensarySlug={dispensarySlug}
      dispensaryId={dispensary.id}
      accessibleDispensaries={accessibleDispensaries}
      agendaModuleAccess={agendaModuleAccess}
      accessibleAgendaIds={accessibleAgendaIds}
    >
      <DispensaryRealtimeShell>
        <QueryProvider>
          <LoggedInShell>
          <Header
            session={authSession}
            impersonatorDisplayName={impersonatorDisplayName}
            dispensarySlug={dispensarySlug}
          />

          <div className="flex-1 w-full min-w-0 pb-[72px] sm:pb-0 min-h-0">
            {children}
          </div>
        </LoggedInShell>
        </QueryProvider>
      </DispensaryRealtimeShell>
    </PermissionsProvider>
  );
}

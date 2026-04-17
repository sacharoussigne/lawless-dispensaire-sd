import Header from '@/app/(loggedIn)/_components/Header/Header';
import { getAuthSession } from '@/lib/auth';
import { Container } from '@mantine/core';
import { PermissionsProvider } from '@/app/_contexts/PermissionsContext';
import { calculatePermissions } from '@/lib/auth/calculatePermissions';
import { getAppSettings } from '@/lib/appSettings';
import type { AuthSession } from '@/types/session';

export default async function LanguageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ userLanguageAlias?: string }>;
}) {
  const session = await getAuthSession();
  const role = session?.user?.role || null;
  const permissions = calculatePermissions(role);
  const appSettings = await getAppSettings();

  return (
    <PermissionsProvider
      initialPermissions={permissions}
      initialRole={role}
      initialAppSettings={appSettings}
    >
      <Header session={session as AuthSession | null} />

      <Container size={"xl"} className={'flex-1 pb-[72px] sm:pb-0'}>
        {children}
      </Container>
    </PermissionsProvider>
  );
}

import Header from '@/app/(loggedIn)/_components/Header/Header';
import { getAuthSession } from '@/lib/auth';
import { Container } from '@mantine/core';
import type { AuthSession } from '@/types/session';
import { getImpersonatorDisplayName } from '@/lib/auth/impersonationDisplay';
import { PermissionsProvider } from '@/app/_contexts/PermissionsContext';
import { APP_SETTINGS_DEFAULTS } from '@/lib/appSettingsShared';

export default async function AdminPlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  const impersonatorDisplayName = await getImpersonatorDisplayName(session?.session?.impersonatedBy);

  return (
    <PermissionsProvider
      initialPermissions={null}
      initialRole={session?.user?.role ?? null}
      initialAppSettings={APP_SETTINGS_DEFAULTS}
    >
      <Header
        session={session as AuthSession | null}
        impersonatorDisplayName={impersonatorDisplayName}
      />
      <Container size="xl" className="flex-1 pb-[72px] sm:pb-0">
        {children}
      </Container>
    </PermissionsProvider>
  );
}

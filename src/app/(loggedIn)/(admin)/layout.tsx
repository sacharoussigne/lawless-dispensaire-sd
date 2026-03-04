import { getAuthSession } from '@/lib/auth';
import { Container } from '@mantine/core';
import Header from '../_components/Header/Header';
import { PermissionsProvider } from '@/app/_contexts/PermissionsContext';
import { calculatePermissions } from '@/lib/auth/calculatePermissions';

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

  return (
    <PermissionsProvider initialPermissions={permissions} initialRole={role}>
      <Header session={session as any} />

      <Container size={'xl'} className={'flex-1 pb-[72px] sm:pb-0'}>
        {children}
      </Container>
    </PermissionsProvider>
  );
}

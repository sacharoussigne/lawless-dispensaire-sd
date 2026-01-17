import Header from '@/app/(loggedIn)/_components/Header/Header';
import BottomBar from '@/app/(loggedIn)/_components/BottomBar/BottomBar';
import { getAuthSession } from '@/lib/auth';
import { Container } from '@mantine/core';
import { PermissionsProvider } from '@/app/_contexts/PermissionsContext';

export default async function LanguageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ userLanguageAlias?: string }>;
}) {
  const session = await getAuthSession();

  return (
    <PermissionsProvider>
      <Header session={session as any} />

      <Container size={'lg'} className={'flex-1 pb-[72px] sm:pb-0'}>
        {children}
      </Container>
      <BottomBar session={session as any} />
    </PermissionsProvider>
  );
}

import { getAuthSession } from '@/lib/auth';
import SettingsPageClient from './SettingsPageClient';
import prisma from '@/lib/prisma';

export default async function SettingsPage() {
  const session = await getAuthSession();

  const canChangePassword = session?.user?.id
    ? Boolean(
        await prisma.account.findFirst({
          where: {
            userId: session.user.id,
            providerId: 'credential',
            password: { not: null },
          },
          select: { id: true },
        }),
      )
    : false;

  return (
    <SettingsPageClient
      initialUser={{
        name: session?.user?.name ?? '',
        image: session?.user?.image ?? null,
      }}
      canChangePassword={canChangePassword}
    />
  );
}


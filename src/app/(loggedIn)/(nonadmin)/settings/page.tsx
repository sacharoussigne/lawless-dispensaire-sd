import { getAuthSession } from '@/lib/auth';
import SettingsPageClient from './SettingsPageClient';
import prisma from '@/lib/prisma';
import { getMyStockUiPreferences } from '@/app/_actions/stockUiPreferences';
import { getDataOrThrow } from '@/lib/response';

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

  const stockUiPreferencesResult = await getMyStockUiPreferences();
  const stockUiPreferences = getDataOrThrow(stockUiPreferencesResult, 'Erreur lors du chargement des préférences');

  return (
    <SettingsPageClient
      initialUser={{
        name: session?.user?.name ?? '',
        image: session?.user?.image ?? null,
      }}
      canChangePassword={canChangePassword}
      initialStockUiPreferences={stockUiPreferences}
    />
  );
}


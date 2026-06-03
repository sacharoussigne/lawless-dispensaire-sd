import prisma from '@/lib/prisma';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';

export async function getDefaultChestId(dispensaryId: string): Promise<string> {
  const defaultChest = await prisma.chest.findFirst({
    where: {
      name: 'Foure tout',
      isEnabled: true,
      ...tenantWhere(dispensaryId),
    },
  });
  if (!defaultChest) {
    throw new Error('Coffre par défaut "Foure tout" non trouvé ou désactivé');
  }
  return defaultChest.id;
}

import prisma from '@/lib/prisma';

export async function getDefaultChestId(): Promise<string> {
  const defaultChest = await prisma.chest.findFirst({
    where: {
      name: 'Foure tout',
      isEnabled: true,
    },
  });
  if (!defaultChest) {
    throw new Error('Coffre par défaut "Foure tout" non trouvé ou désactivé');
  }
  return defaultChest.id;
}

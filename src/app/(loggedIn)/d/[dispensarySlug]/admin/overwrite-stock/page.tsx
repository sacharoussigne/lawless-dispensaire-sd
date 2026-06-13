import { getItemsWithStockForDate } from '@/app/_actions/stock';
import { getChestsList } from '@/app/_actions/chests';
import OverwriteStockPageClient from './OverwriteStockPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import dayjs from '@/lib/dayjs';
import { getDataOrThrow } from '@/lib/response';
import type { ItemWithStock } from '@/types/overwriteStock';

async function OverwriteStockContent({ dispensarySlug }: { dispensarySlug: string }) {
  const today = dayjs().toDate();
  const [itemsResult, chestsResult] = await Promise.all([
    getItemsWithStockForDate(dispensarySlug, today),
    getChestsList(dispensarySlug, true),
  ]);

  const items: ItemWithStock[] =
    itemsResult.status === 200 && 'data' in itemsResult && itemsResult.data && Array.isArray(itemsResult.data)
      ? itemsResult.data
      : [];

  const chests = getDataOrThrow(chestsResult, 'Erreur lors du chargement des coffres');

  return (
    <OverwriteStockPageClient
      initialItems={items}
      initialDate={dayjs().format('YYYY-MM-DD')}
      initialChests={chests}
    />
  );
}

export default async function OverwriteStockPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <OverwriteStockContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}

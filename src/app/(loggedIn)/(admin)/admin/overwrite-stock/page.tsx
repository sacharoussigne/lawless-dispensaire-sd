import { getItemsWithStockForDate } from '@/app/_actions/stock';
import { getChests } from '@/app/_actions/chests';
import OverwriteStockPageClient from './OverwriteStockPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import dayjs from '@/lib/dayjs';
import { getDataOrThrow } from '@/lib/response';
import type { ItemWithStock } from '@/types/overwriteStock';
import type { ChestWithStockHistory } from '@/types/chests';

async function OverwriteStockContent() {
  const today = dayjs().toDate();
  const [itemsResult, chestsResult] = await Promise.all([
    getItemsWithStockForDate(today),
    getChests(),
  ]);

  const items: ItemWithStock[] =
    itemsResult.status === 200 && 'data' in itemsResult && itemsResult.data && Array.isArray(itemsResult.data)
      ? itemsResult.data
      : [];

  const chests: ChestWithStockHistory[] = getDataOrThrow(chestsResult, 'Erreur lors du chargement des coffres');

  return <OverwriteStockPageClient initialItems={items} initialDate={dayjs().format('YYYY-MM-DD')} initialChests={chests} />;
}

export default function OverwriteStockPage() {
  return (
    <SuspenseLoader>
      <OverwriteStockContent />
    </SuspenseLoader>
  );
}

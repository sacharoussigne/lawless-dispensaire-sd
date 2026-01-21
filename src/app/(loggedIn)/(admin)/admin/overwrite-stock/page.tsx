import { getItemsWithStockForDate } from '@/app/_actions/stock';
import OverwriteStockPageClient from './OverwriteStockPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import dayjs from '@/lib/dayjs';
import type { ItemWithStock } from '@/types/overwriteStock';

async function OverwriteStockContent() {
  const today = dayjs().toDate();
  const result = await getItemsWithStockForDate(today);

  const items: ItemWithStock[] =
    result.status === 200 && 'data' in result && result.data && Array.isArray(result.data)
      ? result.data
      : [];

  return <OverwriteStockPageClient initialItems={items} initialDate={dayjs().format('YYYY-MM-DD')} />;
}

export default function OverwriteStockPage() {
  return (
    <SuspenseLoader>
      <OverwriteStockContent />
    </SuspenseLoader>
  );
}

import { getItemsWithStock } from '@/app/_actions/stock';
import StockPageClient from './StockPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';

async function StockContent() {
  const result = await getItemsWithStock();
  const items = result.status === 200 && 'data' in result && result.data ? result.data : [];

  return <StockPageClient initialItems={items} />;
}

export default function StockPage() {
  return (
    <SuspenseLoader>
      <StockContent />
    </SuspenseLoader>
  );
}

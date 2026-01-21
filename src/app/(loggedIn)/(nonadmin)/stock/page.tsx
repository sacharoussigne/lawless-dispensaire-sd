import { getItemsWithStock } from '@/app/_actions/stock';
import StockPageClient from './StockPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function StockContent() {
  const result = await getItemsWithStock();
  
  // Lance une erreur si la réponse est une erreur (sera capturée par error.tsx)
  const items = getDataOrThrow(result, 'Erreur lors du chargement du stock');

  return <StockPageClient initialItems={items} />;
}

export default function StockPage() {
  return (
    <SuspenseLoader>
      <StockContent />
    </SuspenseLoader>
  );
}

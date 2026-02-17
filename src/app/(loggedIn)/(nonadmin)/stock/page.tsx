import { getItemsWithStock } from '@/app/_actions/stock';
import { getChests } from '@/app/_actions/chests';
import StockPageClient from './StockPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function StockContent() {
  const [itemsResult, chestsResult] = await Promise.all([
    getItemsWithStock(),
    getChests(),
  ]);
  
  // Lance une erreur si la réponse est une erreur (sera capturée par error.tsx)
  const items = getDataOrThrow(itemsResult, 'Erreur lors du chargement du stock');
  const chests = getDataOrThrow(chestsResult, 'Erreur lors du chargement des coffres');

  return <StockPageClient initialItems={items} initialChests={chests} />;
}

export default function StockPage() {
  return (
    <SuspenseLoader>
      <StockContent />
    </SuspenseLoader>
  );
}

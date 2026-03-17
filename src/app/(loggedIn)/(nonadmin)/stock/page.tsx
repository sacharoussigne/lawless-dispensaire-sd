import { getItemsWithStock } from '@/app/_actions/stock';
import { getChests } from '@/app/_actions/chests';
import StockPageClient from './StockPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';
import { getMyStockUiPreferences } from '@/app/_actions/stockUiPreferences';

async function StockContent() {
  const [itemsResult, chestsResult, stockUiPreferencesResult] = await Promise.all([
    getItemsWithStock(),
    getChests(true),
    getMyStockUiPreferences(),
  ]);
  
  // Throws an error if the response is an error (will be caught by error.tsx)
  const items = getDataOrThrow(itemsResult, 'Erreur lors du chargement du stock');
  const chests = getDataOrThrow(chestsResult, 'Erreur lors du chargement des coffres');
  const stockUiPreferences = getDataOrThrow(stockUiPreferencesResult, 'Erreur lors du chargement des préférences');

  return <StockPageClient initialItems={items} initialChests={chests} stockUiPreferences={stockUiPreferences} />;
}

export default function StockPage() {
  return (
    <SuspenseLoader>
      <StockContent />
    </SuspenseLoader>
  );
}

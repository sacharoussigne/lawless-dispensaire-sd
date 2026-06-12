import { getItemsWithStock } from '@/app/_actions/stock';
import { getChestsList } from '@/app/_actions/chests';
import { getStockChecksSummary } from '@/app/_actions/stockChecks';
import StockPageClient from './StockPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';
import { getMyStockUiPreferences } from '@/app/_actions/stockUiPreferences';

async function StockContent({ dispensarySlug }: { dispensarySlug: string }) {
  const [itemsResult, chestsResult, stockUiPreferencesResult, stockChecksSummaryResult] = await Promise.all([
    getItemsWithStock(dispensarySlug),
    getChestsList(dispensarySlug, true),
    getMyStockUiPreferences(),
    getStockChecksSummary(dispensarySlug),
  ]);

  const items = getDataOrThrow(itemsResult, 'Erreur lors du chargement du stock');
  const chests = getDataOrThrow(chestsResult, 'Erreur lors du chargement des coffres');
  const stockUiPreferences = getDataOrThrow(stockUiPreferencesResult, 'Erreur lors du chargement des préférences');
  const stockChecksSummary = getDataOrThrow(stockChecksSummaryResult, 'Erreur lors du chargement des contrôles stock');

  return (
    <StockPageClient
      initialItems={items}
      initialChests={chests}
      initialStockChecksSummary={stockChecksSummary}
      stockUiPreferences={stockUiPreferences}
    />
  );
}

export default async function StockPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <StockContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}

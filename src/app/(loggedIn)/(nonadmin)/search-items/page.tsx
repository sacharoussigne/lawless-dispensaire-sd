import { getItems } from '@/app/_actions/items';
import { getChests } from '@/app/_actions/chests';
import SearchItemsPageClient from './SearchItemsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function SearchItemsContent() {
  const [itemsResult, chestsResult] = await Promise.all([
    getItems(),
    getChests(),
  ]);

  const items = getDataOrThrow(itemsResult, 'Erreur lors du chargement des items');
  const chests = getDataOrThrow(chestsResult, 'Erreur lors du chargement des coffres');

  return <SearchItemsPageClient initialItems={items} initialChests={chests} />;
}

export default function SearchItemsPage() {
  return (
    <SuspenseLoader>
      <SearchItemsContent />
    </SuspenseLoader>
  );
}

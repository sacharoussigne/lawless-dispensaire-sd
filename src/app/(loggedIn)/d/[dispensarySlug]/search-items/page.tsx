import { getItems } from '@/app/_actions/items';
import SearchItemsPageClient from './SearchItemsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function SearchItemsContent({ dispensarySlug }: { dispensarySlug: string }) {
  const itemsResult = await getItems(dispensarySlug);
  const items = getDataOrThrow(itemsResult, 'Erreur lors du chargement des items');

  return <SearchItemsPageClient initialItems={items} />;
}

export default async function SearchItemsPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <SearchItemsContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}

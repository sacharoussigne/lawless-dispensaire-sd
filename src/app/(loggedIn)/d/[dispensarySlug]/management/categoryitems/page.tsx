import { getCategoryItems } from '@/app/_actions/categoryItems';
import CategoryItemsPageClient from './CategoryItemsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function CategoryItemsContent({ dispensarySlug }: { dispensarySlug: string }) {
  const result = await getCategoryItems(dispensarySlug);
  
  // Lance une erreur si la réponse est une erreur (sera capturée par error.tsx)
  const categoryItems = getDataOrThrow(result, 'Erreur lors du chargement des catégories');

  return <CategoryItemsPageClient initialCategoryItems={categoryItems} />;
}

export default async function CategoryItemsPage({ params }: { params: Promise<{ dispensarySlug: string }> }) {
  const { dispensarySlug } = await params;
  return (
    <SuspenseLoader>
      <CategoryItemsContent dispensarySlug={dispensarySlug} />
    </SuspenseLoader>
  );
}

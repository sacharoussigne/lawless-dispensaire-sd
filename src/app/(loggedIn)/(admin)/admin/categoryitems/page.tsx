import { getCategoryItems } from '@/app/_actions/categoryItems';
import CategoryItemsPageClient from './CategoryItemsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function CategoryItemsContent() {
  const result = await getCategoryItems();
  
  // Lance une erreur si la réponse est une erreur (sera capturée par error.tsx)
  const categoryItems = getDataOrThrow(result, 'Erreur lors du chargement des catégories');

  return <CategoryItemsPageClient initialCategoryItems={categoryItems} />;
}

export default function CategoryItemsPage() {
  return (
    <SuspenseLoader>
      <CategoryItemsContent />
    </SuspenseLoader>
  );
}

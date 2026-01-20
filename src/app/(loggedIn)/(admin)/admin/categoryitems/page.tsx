import { getCategoryItems } from '@/app/_actions/categoryItems';
import CategoryItemsPageClient from './CategoryItemsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import type { CategoryItemWithItems } from '@/types/categoryItems';

async function CategoryItemsContent() {
  const result = await getCategoryItems();
  const categoryItems: CategoryItemWithItems[] =
    result.status === 200 && 'data' in result && result.data ? result.data : [];

  return <CategoryItemsPageClient initialCategoryItems={categoryItems} />;
}

export default function CategoryItemsPage() {
  return (
    <SuspenseLoader>
      <CategoryItemsContent />
    </SuspenseLoader>
  );
}

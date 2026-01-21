import { getItems } from '@/app/_actions/items';
import { getCategoryItems } from '@/app/_actions/categoryItems';
import { getCompanyGroups } from '@/app/_actions/companyGroups';
import ItemsPageClient from './ItemsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';

async function ItemsContent() {
  // Charger toutes les données en parallèle
  const [itemsResult, categoryItemsResult, companyGroupsResult] = await Promise.all([
    getItems(),
    getCategoryItems(),
    getCompanyGroups(),
  ]);

  const items = itemsResult.status === 200 && 'data' in itemsResult && itemsResult.data ? itemsResult.data : [];
  const categoryItems = categoryItemsResult.status === 200 && 'data' in categoryItemsResult && categoryItemsResult.data ? categoryItemsResult.data : [];
  const companyGroups = companyGroupsResult.status === 200 && 'data' in companyGroupsResult && companyGroupsResult.data ? companyGroupsResult.data : [];

  return (
    <ItemsPageClient
      initialItems={items}
      categoryItems={categoryItems}
      companyGroups={companyGroups}
    />
  );
}

export default function ItemsPage() {
  return (
    <SuspenseLoader>
      <ItemsContent />
    </SuspenseLoader>
  );
}

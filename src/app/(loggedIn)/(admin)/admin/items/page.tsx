import { getItems } from '@/app/_actions/items';
import { getCategoryItems } from '@/app/_actions/categoryItems';
import { getCompanyGroups } from '@/app/_actions/companyGroups';
import ItemsPageClient from './ItemsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';

async function ItemsContent() {
  // Charger toutes les données en parallèle
  const [itemsResult, categoryItemsResult, companyGroupsResult] = await Promise.all([
    getItems(),
    getCategoryItems(),
    getCompanyGroups(),
  ]);

  // Lance une erreur si une des réponses est une erreur (sera capturée par error.tsx)
  const items = getDataOrThrow(itemsResult, 'Erreur lors du chargement des objets');
  const categoryItems = getDataOrThrow(categoryItemsResult, 'Erreur lors du chargement des catégories');
  const companyGroups = getDataOrThrow(companyGroupsResult, 'Erreur lors du chargement des groupes d\'entreprises');

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

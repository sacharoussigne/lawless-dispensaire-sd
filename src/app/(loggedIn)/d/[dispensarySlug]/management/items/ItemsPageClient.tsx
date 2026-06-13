'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container, Group, Button } from '@mantine/core';
import { PageHeader } from '@/app/_components/PageHeader/PageHeader';
import { IconPlus } from '@tabler/icons-react';
import { ItemModal } from './components/ItemModal';
import { DeleteItemModal } from './components/DeleteItemModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { ItemsTable } from './components/ItemsTable';
import { ReorderModal } from './components/ReorderModal';
import { CraftRecipesModal } from './components/CraftRecipesModal';
import type { ItemWithRelations, CompanyGroupSelect } from '@/types/items';
import type { CategoryItemWithCount } from '@/types/categoryItems';
import { normalizeString } from '@/lib/string/normalizeString';
import { sortItems } from '@/lib/stock/sortItemsByCategory';
import {
  useManagementItems,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useReorderItemsMutation,
} from './hooks/useItemsQueries';

interface ItemsPageClientProps {
  initialItems: ItemWithRelations[];
  categoryItems: CategoryItemWithCount[];
  companyGroups: CompanyGroupSelect[];
}

export default function ItemsPageClient({
  initialItems,
  categoryItems,
  companyGroups,
}: ItemsPageClientProps) {
  const { data: items = [], isFetching } = useManagementItems(initialItems);
  const createMutation = useCreateItemMutation();
  const updateMutation = useUpdateItemMutation();
  const deleteMutation = useDeleteItemMutation();
  const reorderMutation = useReorderItemsMutation();

  const [modalOpened, setModalOpened] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemWithRelations | null>(null);
  const [craftRecipesModalOpened, setCraftRecipesModalOpened] = useState(false);
  const [selectedItemForCraft, setSelectedItemForCraft] = useState<ItemWithRelations | null>(null);
  const [reorderModalOpened, setReorderModalOpened] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [companyGroupFilter, setCompanyGroupFilter] = useState<string | null>(null);
  const [craftableFilter, setCraftableFilter] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { paginatedItems, totalRecords } = useMemo(() => {
    const filtered = items.filter((item) => {
      const matchesName =
        !nameFilter ||
        normalizeString(item.name).includes(normalizeString(nameFilter));
      const matchesCategory =
        !categoryFilter || item.categoryId === categoryFilter;
      const matchesCompanyGroup =
        !companyGroupFilter || item.companyGroupId === companyGroupFilter;
      const matchesCraftable =
        craftableFilter === null ||
        (craftableFilter === 'true' && item.isCraftable) ||
        (craftableFilter === 'false' && !item.isCraftable);
      return matchesName && matchesCategory && matchesCompanyGroup && matchesCraftable;
    });
    const sorted = sortItems(filtered);
    return {
      paginatedItems: sorted.slice((page - 1) * pageSize, page * pageSize),
      totalRecords: sorted.length,
    };
  }, [items, nameFilter, categoryFilter, companyGroupFilter, craftableFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, companyGroupFilter, craftableFilter, nameFilter]);

  const handleEdit = (item: ItemWithRelations) => {
    setEditingItem(item);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setModalOpened(true);
  };

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Objets"
        description="Catalogue des objets du dispensaire, catégories et paramètres de stock."
        actions={
          <Group>
            <Button
              variant="light"
              onClick={() => setReorderModalOpened(true)}
              disabled={items.length === 0}
            >
              Réordonner
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
              Créer un objet
            </Button>
          </Group>
        }
      />

      <ActiveFilters
        filters={[
          {
            label: 'Catégorie',
            value: categoryFilter,
            onRemove: () => setCategoryFilter(null),
            displayValue: categoryFilter
              ? categoryItems.find((c) => c.id === categoryFilter)?.name || 'Inconnu'
              : undefined,
          },
          {
            label: 'Groupe',
            value: companyGroupFilter,
            onRemove: () => setCompanyGroupFilter(null),
            displayValue: companyGroupFilter
              ? companyGroups.find((g) => g.id === companyGroupFilter)?.name || 'Inconnu'
              : undefined,
          },
          {
            label: 'Craftable',
            value: craftableFilter,
            onRemove: () => setCraftableFilter(null),
            displayValue: craftableFilter === 'true' ? 'Oui' : craftableFilter === 'false' ? 'Non' : undefined,
          },
          {
            label: 'Nom',
            value: nameFilter,
            onRemove: () => setNameFilter(''),
          },
        ]}
      />

      <ItemsTable
        items={paginatedItems}
        loading={isFetching}
        categoryItems={categoryItems}
        companyGroups={companyGroups}
        categoryFilter={categoryFilter}
        companyGroupFilter={companyGroupFilter}
        craftableFilter={craftableFilter}
        nameFilter={nameFilter}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onCategoryFilterChange={setCategoryFilter}
        onCompanyGroupFilterChange={setCompanyGroupFilter}
        onCraftableFilterChange={setCraftableFilter}
        onNameFilterChange={setNameFilter}
        onPageChange={setPage}
        onEdit={handleEdit}
        onDelete={(item) => {
          setItemToDelete(item);
          setDeleteModalOpened(true);
        }}
        onManageCraftRecipes={(item) => {
          setSelectedItemForCraft(item);
          setCraftRecipesModalOpened(true);
        }}
      />

      <ItemModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingItem(null);
        }}
        editingItem={editingItem}
        categoryItems={categoryItems}
        companyGroups={companyGroups}
        createMutation={createMutation}
        updateMutation={updateMutation}
      />

      <DeleteItemModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setItemToDelete(null);
        }}
        itemToDelete={itemToDelete}
        deleteMutation={deleteMutation}
      />

      <CraftRecipesModal
        opened={craftRecipesModalOpened}
        onClose={() => {
          setCraftRecipesModalOpened(false);
          setSelectedItemForCraft(null);
        }}
        selectedItem={selectedItemForCraft}
        items={items}
      />

      <ReorderModal
        opened={reorderModalOpened}
        onClose={() => setReorderModalOpened(false)}
        items={items}
        categoryItems={categoryItems}
        reorderMutation={reorderMutation}
      />
    </Container>
  );
}

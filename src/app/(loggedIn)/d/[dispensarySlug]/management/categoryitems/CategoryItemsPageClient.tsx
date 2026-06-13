'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container, Title, Group, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { CategoryItemModal } from './components/CategoryItemModal';
import { DeleteCategoryItemModal } from './components/DeleteCategoryItemModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { CategoryItemsTable } from './components/CategoryItemsTable';
import { ReorderCategoryItemsModal } from './components/ReorderCategoryItemsModal';
import type { CategoryItemWithCount } from '@/types/categoryItems';
import { normalizeString } from '@/lib/string/normalizeString';
import { sortCategoryItems } from '@/lib/categoryItems/sortCategoryItems';
import {
  useManagementCategoryItems,
  useCreateCategoryItemMutation,
  useUpdateCategoryItemMutation,
  useDeleteCategoryItemMutation,
  useReorderCategoryItemsMutation,
} from './hooks/useCategoryItemsQueries';

interface CategoryItemsPageClientProps {
  initialCategoryItems: CategoryItemWithCount[];
}

export default function CategoryItemsPageClient({
  initialCategoryItems,
}: CategoryItemsPageClientProps) {
  const { data: categoryItems = [], isFetching } = useManagementCategoryItems(initialCategoryItems);
  const createMutation = useCreateCategoryItemMutation();
  const updateMutation = useUpdateCategoryItemMutation();
  const deleteMutation = useDeleteCategoryItemMutation();
  const reorderMutation = useReorderCategoryItemsMutation();

  const [modalOpened, setModalOpened] = useState(false);
  const [editingCategoryItem, setEditingCategoryItem] = useState<CategoryItemWithCount | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [categoryItemToDelete, setCategoryItemToDelete] = useState<CategoryItemWithCount | null>(null);
  const [reorderModalOpened, setReorderModalOpened] = useState(false);

  const [nameFilter, setNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { paginatedCategoryItems, totalRecords } = useMemo(() => {
    const filtered = categoryItems.filter((categoryItem) => {
      if (!nameFilter) return true;
      return normalizeString(categoryItem.name).includes(normalizeString(nameFilter));
    });
    const sorted = sortCategoryItems(filtered);
    return {
      paginatedCategoryItems: sorted.slice((page - 1) * pageSize, page * pageSize),
      totalRecords: sorted.length,
    };
  }, [categoryItems, nameFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  const handleEdit = (categoryItem: CategoryItemWithCount) => {
    setEditingCategoryItem(categoryItem);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingCategoryItem(null);
    setModalOpened(true);
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Catégories d&apos;objets</Title>
        <Group>
          <Button
            variant="light"
            onClick={() => setReorderModalOpened(true)}
            disabled={categoryItems.length === 0}
          >
            Réordonner
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Créer une catégorie d&apos;objet
          </Button>
        </Group>
      </Group>

      <ActiveFilters
        filters={[
          {
            label: 'Nom',
            value: nameFilter,
            onRemove: () => setNameFilter(''),
          },
        ]}
      />

      <CategoryItemsTable
        items={paginatedCategoryItems}
        loading={isFetching}
        nameFilter={nameFilter}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onNameFilterChange={setNameFilter}
        onPageChange={setPage}
        onEdit={handleEdit}
        onDelete={(categoryItem) => {
          setCategoryItemToDelete(categoryItem);
          setDeleteModalOpened(true);
        }}
      />

      <CategoryItemModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingCategoryItem(null);
        }}
        editingCategoryItem={editingCategoryItem}
        createMutation={createMutation}
        updateMutation={updateMutation}
      />

      <DeleteCategoryItemModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setCategoryItemToDelete(null);
        }}
        categoryItemToDelete={categoryItemToDelete}
        deleteMutation={deleteMutation}
      />

      <ReorderCategoryItemsModal
        opened={reorderModalOpened}
        onClose={() => setReorderModalOpened(false)}
        categoryItems={categoryItems}
        reorderMutation={reorderMutation}
      />
    </Container>
  );
}

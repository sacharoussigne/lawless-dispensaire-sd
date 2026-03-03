'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { getCategoryItems } from '@/app/_actions/categoryItems';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { CategoryItemModal } from './components/CategoryItemModal';
import { DeleteCategoryItemModal } from './components/DeleteCategoryItemModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { CategoryItemsTable } from './components/CategoryItemsTable';
import { ReorderCategoryItemsModal } from './components/ReorderCategoryItemsModal';
import type { CategoryItemWithItems } from '@/types/categoryItems';

interface CategoryItemsPageClientProps {
  initialCategoryItems: CategoryItemWithItems[];
}

// Fonction pour normaliser les chaînes (enlever les accents et mettre en minuscule)
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function CategoryItemsPageClient({
  initialCategoryItems,
}: CategoryItemsPageClientProps) {
  const [categoryItems, setCategoryItems] = useState<CategoryItemWithItems[]>(initialCategoryItems);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingCategoryItem, setEditingCategoryItem] = useState<CategoryItemWithItems | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [categoryItemToDelete, setCategoryItemToDelete] = useState<CategoryItemWithItems | null>(null);
  const [reorderModalOpened, setReorderModalOpened] = useState(false);

  const [nameFilter, setNameFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const loadCategoryItems = async () => {
    try {
      setLoading(true);
      const result = await getCategoryItems();
      const data = handleAction(result);
      if (data) {
        setCategoryItems(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des catégories d\'objets',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (categoryItem: CategoryItemWithItems) => {
    setEditingCategoryItem(categoryItem);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingCategoryItem(null);
    setModalOpened(true);
  };

  // Filtrer les catégories d'items par nom
  const filteredCategoryItems = categoryItems.filter((categoryItem) => {
    const matchesName =
      !nameFilter ||
      normalizeString(categoryItem.name).includes(normalizeString(nameFilter));
    return matchesName;
  });

  // Trier par ordre puis par nom
  const sortedCategoryItems = [...filteredCategoryItems].sort((a, b) => {
    // Si les deux ont un ordre, trier par ordre
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    // Sinon, trier par nom
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  });

  // Calculer la pagination
  const totalRecords = sortedCategoryItems.length;
  const paginatedCategoryItems = sortedCategoryItems.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Catégories d'objets</Title>
        <Group>
          <Button
            variant="light"
            onClick={() => setReorderModalOpened(true)}
            disabled={categoryItems.length === 0}
          >
            Réordonner
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Créer une catégorie d'objet
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
        loading={loading}
        nameFilter={nameFilter}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onNameFilterChange={(value) => setNameFilter(value)}
        onPageChange={(p) => setPage(p)}
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
        onSuccess={loadCategoryItems}
      />

      <DeleteCategoryItemModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setCategoryItemToDelete(null);
        }}
        categoryItemToDelete={categoryItemToDelete}
        onSuccess={loadCategoryItems}
      />

      <ReorderCategoryItemsModal
        opened={reorderModalOpened}
        onClose={() => setReorderModalOpened(false)}
        categoryItems={categoryItems}
        onSuccess={loadCategoryItems}
      />
    </Container>
  );
}


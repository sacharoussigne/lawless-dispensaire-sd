'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { getItems } from '@/app/_actions/items';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { ItemModal } from './components/ItemModal';
import { DeleteItemModal } from './components/DeleteItemModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { ItemsTable } from './components/ItemsTable';
import { ReorderModal } from './components/ReorderModal';
import { CraftRecipesModal } from './components/CraftRecipesModal';
import type { ItemWithRelations, CategoryItem, CompanyGroup } from '@/types/items';

interface ItemsPageClientProps {
  initialItems: ItemWithRelations[];
  categoryItems: CategoryItem[];
  companyGroups: CompanyGroup[];
}

// Fonction pour normaliser les chaînes (enlever les accents et mettre en minuscule)
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function ItemsPageClient({
  initialItems,
  categoryItems,
  companyGroups,
}: ItemsPageClientProps) {
  const [items, setItems] = useState<ItemWithRelations[]>(initialItems);
  const [loading, setLoading] = useState(false);
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
  const [nameFilter, setNameFilter] = useState<string>('');
  const [descriptionFilter, setDescriptionFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await getItems();
      const data = handleAction(result);
      if (data) {
        setItems(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des objets',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: ItemWithRelations) => {
    setEditingItem(item);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setModalOpened(true);
  };

  // Filtrer les items
  const filteredItems = items.filter((item) => {
    const matchesName =
      !nameFilter ||
      normalizeString(item.name).includes(normalizeString(nameFilter));
    const matchesDescription =
      !descriptionFilter ||
      (item.description &&
        normalizeString(item.description).includes(
          normalizeString(descriptionFilter)
        ));
    const matchesCategory =
      !categoryFilter || item.categoryId === categoryFilter;
    const matchesCompanyGroup =
      !companyGroupFilter || item.companyGroupId === companyGroupFilter;
    const matchesCraftable =
      craftableFilter === null ||
      (craftableFilter === 'true' && item.isCraftable) ||
      (craftableFilter === 'false' && !item.isCraftable);
    return (
      matchesName &&
      matchesDescription &&
      matchesCategory &&
      matchesCompanyGroup &&
      matchesCraftable
    );
  });

  // Trier par nom
  const sortedItems = [...filteredItems].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );

  // Calculer la pagination
  const totalRecords = sortedItems.length;
  const paginatedItems = sortedItems.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [
    categoryFilter,
    companyGroupFilter,
    craftableFilter,
    nameFilter,
    descriptionFilter,
  ]);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Objets</Title>
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
      </Group>

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
          {
            label: 'Description',
            value: descriptionFilter,
            onRemove: () => setDescriptionFilter(''),
          },
        ]}
      />

      <ItemsTable
        items={paginatedItems}
        loading={loading}
        categoryItems={categoryItems}
        companyGroups={companyGroups}
        categoryFilter={categoryFilter}
        companyGroupFilter={companyGroupFilter}
        craftableFilter={craftableFilter}
        nameFilter={nameFilter}
        descriptionFilter={descriptionFilter}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onCategoryFilterChange={(value) => setCategoryFilter(value)}
        onCompanyGroupFilterChange={(value) => setCompanyGroupFilter(value)}
        onCraftableFilterChange={(value) => setCraftableFilter(value)}
        onNameFilterChange={(value) => setNameFilter(value)}
        onDescriptionFilterChange={(value) => setDescriptionFilter(value)}
        onPageChange={(p) => setPage(p)}
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
        onSuccess={loadItems}
      />

      <DeleteItemModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setItemToDelete(null);
        }}
        itemToDelete={itemToDelete}
        onSuccess={loadItems}
      />

      <CraftRecipesModal
        opened={craftRecipesModalOpened}
        onClose={() => {
          setCraftRecipesModalOpened(false);
          setSelectedItemForCraft(null);
        }}
        selectedItem={selectedItemForCraft}
        items={items}
        onSuccess={loadItems}
      />

      <ReorderModal
        opened={reorderModalOpened}
        onClose={() => setReorderModalOpened(false)}
        items={items}
        categoryItems={categoryItems}
        onSuccess={loadItems}
      />
    </Container>
  );
}

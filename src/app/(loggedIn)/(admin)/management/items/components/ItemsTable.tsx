'use client';

import { Paper, TextInput, Select, Badge, Group, ActionIcon } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash, IconTools } from '@tabler/icons-react';
import type { ItemWithRelations, CategoryItem, CompanyGroup } from '@/types/items';

interface ItemsTableProps {
  items: ItemWithRelations[];
  loading: boolean;
  categoryItems: CategoryItem[];
  companyGroups: CompanyGroup[];
  categoryFilter: string | null;
  companyGroupFilter: string | null;
  craftableFilter: string | null;
  nameFilter: string;
  descriptionFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  onCategoryFilterChange: (value: string | null) => void;
  onCompanyGroupFilterChange: (value: string | null) => void;
  onCraftableFilterChange: (value: string | null) => void;
  onNameFilterChange: (value: string) => void;
  onDescriptionFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (item: ItemWithRelations) => void;
  onDelete: (item: ItemWithRelations) => void;
  onManageCraftRecipes: (item: ItemWithRelations) => void;
}

// Fonction pour calculer la luminosité d'une couleur hexadécimale
const getLuminance = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const [rs, gs, bs] = [r, g, b].map((val) => {
    return val <= 0.03928
      ? val / 12.92
      : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

// Fonction pour déterminer si le texte doit être blanc ou noir selon la couleur de fond
const getTextColor = (backgroundColor: string): string => {
  const luminance = getLuminance(backgroundColor);
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

export function ItemsTable({
  items,
  loading,
  categoryItems,
  companyGroups,
  categoryFilter,
  companyGroupFilter,
  craftableFilter,
  nameFilter,
  descriptionFilter,
  page,
  pageSize,
  totalRecords,
  onCategoryFilterChange,
  onCompanyGroupFilterChange,
  onCraftableFilterChange,
  onNameFilterChange,
  onDescriptionFilterChange,
  onPageChange,
  onEdit,
  onDelete,
  onManageCraftRecipes,
}: ItemsTableProps) {
  const categoryOptions = [...categoryItems]
    .sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    })
    .map((category) => ({
      value: category.id,
      label: category.name,
    }));

  const companyGroupOptions = [...companyGroups]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    .map((group) => ({
      value: group.id,
      label: group.name,
    }));

  const categoryFilterOptions = [
    { value: '', label: 'Toutes les catégories' },
    ...categoryOptions,
  ];

  const companyGroupFilterOptions = [
    { value: '', label: "Tous les groupes d'entreprises" },
    ...companyGroupOptions,
  ];

  return (
    <Paper shadow="sm" p="md" withBorder>
      <DataTable
        records={items}
        columns={[
          {
            accessor: 'category.name',
            title: 'Catégorie',
            render: (item: ItemWithRelations) => {
              if (!item.category) return '-';
              const textColor = getTextColor(item.category.color);
              return (
                <Badge
                  style={{
                    backgroundColor: item.category.color,
                    color: textColor,
                  }}
                  variant="filled"
                >
                  {item.category.name}
                </Badge>
              );
            },
            filter: (
              <Select
                placeholder="Toutes les catégories"
                data={categoryFilterOptions}
                value={categoryFilter || ''}
                onChange={(value) => onCategoryFilterChange(value || null)}
                clearable
                style={{ minWidth: 200 }}
              />
            ),
          },
          {
            accessor: 'name',
            title: 'Nom',
            filter: (
              <TextInput
                placeholder="Rechercher un nom..."
                value={nameFilter}
                onChange={(e) => onNameFilterChange(e.currentTarget.value)}
                style={{ minWidth: 200 }}
              />
            ),
          },
          {
            accessor: 'idealQuantity',
            title: 'Qty min.',
            render: (item: ItemWithRelations) => item.idealQuantity,
          },
          {
            accessor: 'isCraftable',
            title: 'Craftable',
            render: (item: ItemWithRelations) =>
              item.isCraftable ? (
                <Badge
                  color="green"
                  variant="light"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onManageCraftRecipes(item)}
                >
                  Oui
                </Badge>
              ) : (
                <Badge color="gray" variant="light">
                  Non
                </Badge>
              ),
            filter: (
              <Select
                placeholder="Tous"
                data={[
                  { value: '', label: 'Tous' },
                  { value: 'true', label: 'Oui' },
                  { value: 'false', label: 'Non' },
                ]}
                value={craftableFilter || ''}
                onChange={(value) => onCraftableFilterChange(value || null)}
                clearable
                style={{ minWidth: 150 }}
              />
            ),
          },
          {
            accessor: 'isEnabled',
            title: 'Activé',
            render: (item: ItemWithRelations) =>
              item.isEnabled ? (
                <Badge color="green" variant="light">
                  Oui
                </Badge>
              ) : (
                <Badge color="red" variant="light">
                  Non
                </Badge>
              ),
          },
          {
            accessor: 'canBeSold',
            title: 'Peut être vendu',
            render: (item: ItemWithRelations) =>
              item.canBeSold ? (
                <Badge color="blue" variant="light">
                  Oui
                </Badge>
              ) : (
                <Badge color="gray" variant="light">
                  Non
                </Badge>
              ),
          },
          {
            accessor: 'price',
            title: 'Prix',
            render: (item: ItemWithRelations) => {
              // Le prix peut être affiché si canBeSold est activé OU si l'item n'est pas craftable
              const canHavePrice = item.canBeSold || !item.isCraftable;
              return canHavePrice && item.price ? (
                `$${Number(item.price).toFixed(2)}`
              ) : (
                '-'
              );
            },
          },
          {
            accessor: 'weight',
            title: 'Poids (kg)',
            render: (item: ItemWithRelations) =>
              item.weight != null ? item.weight.toFixed(2) : '-',
          },
          {
            accessor: 'companyGroup.name',
            title: "Groupe",
            render: (item: ItemWithRelations) => item.companyGroup?.name || '-',
            filter: (
              <Select
                placeholder="Tous les groupes"
                data={companyGroupFilterOptions}
                value={companyGroupFilter || ''}
                onChange={(value) => onCompanyGroupFilterChange(value || null)}
                clearable
                style={{ minWidth: 200 }}
              />
            ),
          },
          {
            accessor: 'actions',
            title: 'Actions',
            render: (item: ItemWithRelations) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                {item.isCraftable && (
                  <ActionIcon
                    variant="light"
                    color="orange"
                    onClick={() => onManageCraftRecipes(item)}
                    title="Gérer les recettes de craft"
                  >
                    <IconTools size={16} />
                  </ActionIcon>
                )}
                <ActionIcon variant="light" color="blue" onClick={() => onEdit(item)}>
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="red"
                  onClick={() => onDelete(item)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ),
          },
        ]}
        fetching={loading}
        noRecordsText={
          categoryFilter ||
          companyGroupFilter ||
          craftableFilter ||
          nameFilter ||
          descriptionFilter
            ? 'Aucun objet trouvé avec ces filtres'
            : 'Aucun objet trouvé'
        }
        striped
        highlightOnHover
        minHeight={200}
        totalRecords={totalRecords}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={onPageChange}
        paginationSize="sm"
        paginationText={({ from, to, totalRecords }) =>
          `${from} - ${to} sur ${totalRecords} objets`
        }
      />
    </Paper>
  );
}


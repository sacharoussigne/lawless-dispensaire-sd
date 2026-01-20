'use client';

import { Paper, Flex, Badge, ActionIcon, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { CategoryItem, CompanyGroup } from '@/types/items';

interface ActiveFiltersProps {
  categoryFilter: string | null;
  companyGroupFilter: string | null;
  craftableFilter: string | null;
  nameFilter: string;
  descriptionFilter: string;
  categoryItems: CategoryItem[];
  companyGroups: CompanyGroup[];
  onRemoveCategoryFilter: () => void;
  onRemoveCompanyGroupFilter: () => void;
  onRemoveCraftableFilter: () => void;
  onRemoveNameFilter: () => void;
  onRemoveDescriptionFilter: () => void;
}

export function ActiveFilters({
  categoryFilter,
  companyGroupFilter,
  craftableFilter,
  nameFilter,
  descriptionFilter,
  categoryItems,
  companyGroups,
  onRemoveCategoryFilter,
  onRemoveCompanyGroupFilter,
  onRemoveCraftableFilter,
  onRemoveNameFilter,
  onRemoveDescriptionFilter,
}: ActiveFiltersProps) {
  if (
    !categoryFilter &&
    !companyGroupFilter &&
    !craftableFilter &&
    !nameFilter &&
    !descriptionFilter
  ) {
    return null;
  }

  return (
    <Paper shadow="sm" p="md" withBorder mb="md">
      <Flex align="center" gap="md" wrap="wrap">
        <Text fw={500}>Filtres :</Text>
        {categoryFilter && (
          <Badge
            variant="light"
            size="lg"
            rightSection={
              <ActionIcon
                size="xs"
                color="blue"
                radius="xl"
                variant="transparent"
                onClick={onRemoveCategoryFilter}
              >
                <IconX size={12} />
              </ActionIcon>
            }
          >
            Catégorie:{' '}
            {categoryItems.find((c) => c.id === categoryFilter)?.name || 'Inconnu'}
          </Badge>
        )}
        {companyGroupFilter && (
          <Badge
            variant="light"
            size="lg"
            rightSection={
              <ActionIcon
                size="xs"
                color="blue"
                radius="xl"
                variant="transparent"
                onClick={onRemoveCompanyGroupFilter}
              >
                <IconX size={12} />
              </ActionIcon>
            }
          >
            Groupe:{' '}
            {companyGroups.find((g) => g.id === companyGroupFilter)?.name ||
              'Inconnu'}
          </Badge>
        )}
        {craftableFilter && (
          <Badge
            variant="light"
            size="lg"
            rightSection={
              <ActionIcon
                size="xs"
                color="blue"
                radius="xl"
                variant="transparent"
                onClick={onRemoveCraftableFilter}
              >
                <IconX size={12} />
              </ActionIcon>
            }
          >
            Craftable: {craftableFilter === 'true' ? 'Oui' : 'Non'}
          </Badge>
        )}
        {nameFilter && (
          <Badge
            variant="light"
            size="lg"
            rightSection={
              <ActionIcon
                size="xs"
                color="blue"
                radius="xl"
                variant="transparent"
                onClick={onRemoveNameFilter}
              >
                <IconX size={12} />
              </ActionIcon>
            }
          >
            Nom: {nameFilter}
          </Badge>
        )}
        {descriptionFilter && (
          <Badge
            variant="light"
            size="lg"
            rightSection={
              <ActionIcon
                size="xs"
                color="blue"
                radius="xl"
                variant="transparent"
                onClick={onRemoveDescriptionFilter}
              >
                <IconX size={12} />
              </ActionIcon>
            }
          >
            Description: {descriptionFilter}
          </Badge>
        )}
      </Flex>
    </Paper>
  );
}


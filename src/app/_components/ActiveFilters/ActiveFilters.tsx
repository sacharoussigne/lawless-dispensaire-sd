'use client';

import { Paper, Flex, Badge, ActionIcon, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

export interface Filter {
  label: string;
  value: string | null;
  onRemove: () => void;
  displayValue?: string; // Optionnel : pour afficher une valeur formatée différente de la valeur brute
}

interface ActiveFiltersProps {
  filters: Filter[];
}

export function ActiveFilters({ filters }: ActiveFiltersProps) {
  // Filtrer les filtres actifs (ceux qui ont une valeur)
  const activeFilters = filters.filter((filter) => filter.value !== null && filter.value !== '');

  // Si aucun filtre actif, ne rien afficher
  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <Paper shadow="sm" p="md" withBorder mb="md">
      <Flex align="center" gap="md" wrap="wrap">
        <Text fw={500}>Filtres :</Text>
        {activeFilters.map((filter, index) => (
          <Badge
            key={index}
            variant="light"
            size="lg"
            rightSection={
              <ActionIcon
                size="xs"
                color="blue"
                radius="xl"
                variant="transparent"
                onClick={filter.onRemove}
              >
                <IconX size={12} />
              </ActionIcon>
            }
          >
            {filter.label}: {filter.displayValue ?? filter.value}
          </Badge>
        ))}
      </Flex>
    </Paper>
  );
}


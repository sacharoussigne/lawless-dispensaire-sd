'use client';

import { Paper, Flex, Badge, ActionIcon, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

interface ActiveFiltersProps {
  nameFilter: string;
  onRemoveNameFilter: () => void;
}

export function ActiveFilters({
  nameFilter,
  onRemoveNameFilter,
}: ActiveFiltersProps) {
  if (!nameFilter) {
    return null;
  }

  return (
    <Paper shadow="sm" p="md" withBorder mb="md">
      <Flex align="center" gap="md" wrap="wrap">
        <Text fw={500}>Filtres :</Text>
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
      </Flex>
    </Paper>
  );
}


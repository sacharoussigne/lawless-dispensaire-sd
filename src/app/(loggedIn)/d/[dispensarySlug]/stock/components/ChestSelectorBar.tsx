'use client';

import { Badge, Group, Select } from '@mantine/core';

interface ChestSelectorBarProps {
  chestOptions: { value: string; label: string }[];
  selectedChestId: string | null;
  isEditing: boolean;
  totalWeightToday: number;
  itemsWithStockToday: number;
  totalItems: number;
  onChangeChestId: (value: string | null) => void;
}

export function ChestSelectorBar({
  chestOptions,
  selectedChestId,
  isEditing,
  totalWeightToday,
  itemsWithStockToday,
  totalItems,
  onChangeChestId,
}: ChestSelectorBarProps) {
  return (
    <Group justify="space-between" align="center" mb="sm" wrap="nowrap">
      <Group gap="md" wrap="nowrap">
        <Select
          placeholder="Sélectionner un coffre"
          data={chestOptions}
          value={selectedChestId || ''}
          onChange={(value) => onChangeChestId(value === '' ? null : value)}
          clearable={false}
          disabled={isEditing}
          style={{ minWidth: 200 }}
        />

        {totalWeightToday > 0 && (
          <Badge color="denim" variant="light" size="lg">
            Poids {selectedChestId === null ? 'total' : ''} (aujourd&apos;hui) : {totalWeightToday.toFixed(2)} kg
          </Badge>
        )}
      </Group>

      {itemsWithStockToday > 0 && (
        <Badge
          color={itemsWithStockToday === totalItems ? 'sage' : 'amber'}
          variant="light"
          size="lg"
        >
          {itemsWithStockToday}/{totalItems} objets stockés aujourd&apos;hui
        </Badge>
      )}
    </Group>
  );
}


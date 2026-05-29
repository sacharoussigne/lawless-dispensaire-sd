'use client';

import { Badge, Select } from '@mantine/core';

interface ChestSelectorBarProps {
  chestOptions: { value: string; label: string }[];
  selectedChestId: string | null;
  isEditing: boolean;
  totalWeightToday: number;
  onChangeChestId: (value: string | null) => void;
}

export function ChestSelectorBar({
  chestOptions,
  selectedChestId,
  isEditing,
  totalWeightToday,
  onChangeChestId,
}: ChestSelectorBarProps) {
  return (
    <div className="flex justify-start items-center mb-2 gap-4">
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
        <Badge color="blue" variant="light" size="lg">
          Poids {selectedChestId === null ? 'total' : ''} (aujourd&apos;hui) : {totalWeightToday.toFixed(2)} kg
        </Badge>
      )}
    </div>
  );
}


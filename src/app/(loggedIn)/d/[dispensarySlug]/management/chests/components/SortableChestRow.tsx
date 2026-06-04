'use client';

import { Group, Text } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ChestWithStockHistory } from '@/types/chests';
import { sortableRowGripStyle, sortableRowStyles } from '@/lib/sortableRowStyles';

interface SortableChestRowProps {
  chest: ChestWithStockHistory;
}

export function SortableChestRow({ chest }: SortableChestRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chest.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={{ ...style, ...sortableRowStyles(isDragging) }}>
      <Group gap="xs" wrap="nowrap">
        <div {...attributes} {...listeners} style={sortableRowGripStyle}>
          <IconGripVertical size={20} stroke={1.5} />
        </div>
        <Text fw={500} c="var(--disp-ink)">
          {chest.name}
        </Text>
      </Group>
    </div>
  );
}

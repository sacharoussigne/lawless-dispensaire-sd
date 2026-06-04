'use client';

import { Group, Text } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CategoryItemWithItems } from '@/types/categoryItems';
import { sortableRowGripStyle, sortableRowStyles } from '@/lib/sortableRowStyles';

interface SortableCategoryItemRowProps {
  categoryItem: CategoryItemWithItems;
}

export function SortableCategoryItemRow({ categoryItem }: SortableCategoryItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoryItem.id });

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
          {categoryItem.name}
        </Text>
      </Group>
    </div>
  );
}

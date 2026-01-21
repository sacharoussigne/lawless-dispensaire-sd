'use client';

import { Group, Text } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CategoryItemWithItems } from '@/types/categoryItems';

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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '12px',
        marginBottom: '8px',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        backgroundColor: isDragging ? '#f8f9fa' : 'white',
        cursor: 'grab',
      }}
    >
      <Group gap="xs">
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            color: '#868e96',
          }}
        >
          <IconGripVertical size={20} />
        </div>
        <Text fw={500}>{categoryItem.name}</Text>
      </Group>
    </div>
  );
}


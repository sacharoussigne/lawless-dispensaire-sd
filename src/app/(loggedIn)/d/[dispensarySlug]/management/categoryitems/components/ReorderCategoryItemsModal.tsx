'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Stack,
  Text,
  Button,
  Group,
} from '@mantine/core';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableCategoryItemRow } from './SortableCategoryItemRow';
import type { CategoryItemWithCount } from '@/types/categoryItems';
import { sortCategoryItems } from '@/lib/categoryItems/sortCategoryItems';
import type { useReorderCategoryItemsMutation } from '../hooks/useCategoryItemsQueries';

interface ReorderCategoryItemsModalProps {
  opened: boolean;
  onClose: () => void;
  categoryItems: CategoryItemWithCount[];
  reorderMutation: ReturnType<typeof useReorderCategoryItemsMutation>;
}

export function ReorderCategoryItemsModal({
  opened,
  onClose,
  categoryItems,
  reorderMutation,
}: ReorderCategoryItemsModalProps) {
  const [reorderItems, setReorderItems] = useState<CategoryItemWithCount[]>([]);
  const snapshotRef = useRef<CategoryItemWithCount[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (opened) {
      snapshotRef.current = sortCategoryItems(categoryItems);
      setReorderItems(snapshotRef.current);
    }
  }, [opened]);

  const handleSaveReorder = async () => {
    try {
      await reorderMutation.mutateAsync({
        items: reorderItems.map((item, index) => ({
          id: item.id,
          order: index,
        })),
      });
      onClose();
      setReorderItems([]);
    } catch {
      // Error notification handled by mutation
    }
  };

  const handleReorderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setReorderItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleClose = () => {
    onClose();
    setReorderItems([]);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Réordonner les catégories"
      size="md"
    >
      <Stack>
        <Text size="sm" c="dimmed" mb="md">
          Glissez-déposez les catégories pour les réordonner
        </Text>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleReorderDragEnd}
        >
          <SortableContext
            items={reorderItems.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <Stack gap="xs">
              {reorderItems.map((categoryItem) => (
                <SortableCategoryItemRow key={categoryItem.id} categoryItem={categoryItem} />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" color="slate" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSaveReorder}
            loading={reorderMutation.isPending}
            disabled={reorderItems.length === 0}
          >
            Valider
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

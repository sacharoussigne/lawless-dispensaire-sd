'use client';

import { useState, useEffect } from 'react';
import { Stack, Text, Button } from '@mantine/core';
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
import { SortableChestRow } from './SortableChestRow';
import type { ChestWithStockHistory } from '@/types/chests';
import { sortChests } from '@/lib/chests/sortChests';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type { useReorderChestsMutation } from '../hooks/useChestsQueries';

interface ReorderChestsModalProps {
  opened: boolean;
  onClose: () => void;
  chests: ChestWithStockHistory[];
  reorderMutation: ReturnType<typeof useReorderChestsMutation>;
}

export function ReorderChestsModal({
  opened,
  onClose,
  chests,
  reorderMutation,
}: ReorderChestsModalProps) {
  const [reorderItems, setReorderItems] = useState<ChestWithStockHistory[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (opened) {
      setReorderItems(sortChests(chests));
    }
  }, [opened, chests]);

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
    <AppModal
      opened={opened}
      onClose={handleClose}
      title="Réordonner les coffres"
      size="md"
      footer={
        <AppModalFooter>
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
        </AppModalFooter>
      }
    >
      <Stack>
        <Text size="sm" c="dimmed" mb="md">
          Glissez-déposez les coffres pour les réordonner
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
              {reorderItems.map((chest) => (
                <SortableChestRow key={chest.id} chest={chest} />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      </Stack>
    </AppModal>
  );
}

'use client';

import { useState, useEffect } from 'react';
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
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { notifications } from '@mantine/notifications';
import { reorderChests } from '@/app/_actions/chests';
import { handleAction } from '@/lib/action';
import { SortableChestRow } from './SortableChestRow';
import type { ChestWithStockHistory } from '@/types/chests';

interface ReorderChestsModalProps {
  opened: boolean;
  onClose: () => void;
  chests: ChestWithStockHistory[];
  onSuccess: () => void;
}

export function ReorderChestsModal({
  opened,
  onClose,
  chests,
  onSuccess,
}: ReorderChestsModalProps) {
  const [reorderItems, setReorderItems] = useState<ChestWithStockHistory[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialiser la liste de réordonnancement avec les coffres triés quand la modal s'ouvre
  useEffect(() => {
    if (opened) {
      const sortedChests = [...chests].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      });
      setReorderItems([...sortedChests]);
    }
  }, [opened, chests]);

  const handleSaveReorder = async () => {
    try {
      setSavingOrder(true);
      const result = await reorderChests({
        items: reorderItems.map((item, index) => ({
          id: item.id,
          order: index,
        })),
      });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Ordre des coffres mis à jour',
        color: 'green',
      });
      onClose();
      setReorderItems([]);
      onSuccess();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la mise à jour de l\'ordre',
        color: 'red',
      });
    } finally {
      setSavingOrder(false);
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
      title="Réordonner les coffres"
      size="md"
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
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSaveReorder}
            loading={savingOrder}
            disabled={reorderItems.length === 0}
          >
            Valider
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

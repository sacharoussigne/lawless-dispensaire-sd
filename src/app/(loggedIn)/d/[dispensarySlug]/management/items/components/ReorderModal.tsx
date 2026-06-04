'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useState } from 'react';
import {
  Modal,
  Stack,
  Text,
  Select,
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
import { reorderItems } from '@/app/_actions/items';
import { handleAction } from '@/lib/action';
import { SortableItemRow } from './SortableItemRow';
import type { ItemWithRelations, CategoryItem } from '@/types/items';

interface ReorderModalProps {
  opened: boolean;
  onClose: () => void;
  items: ItemWithRelations[];
  categoryItems: CategoryItem[];
  onSuccess: () => void;
}

export function ReorderModal({
  opened,
  onClose,
  items,
  categoryItems,
  onSuccess,
}: ReorderModalProps) {
  const { dispensarySlug } = usePermissions();
  const [selectedCategoryForReorder, setSelectedCategoryForReorder] = useState<string | null>(null);
  const [reorderItemsList, setReorderItemsList] = useState<ItemWithRelations[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const categoryOptions = [...categoryItems]
    .sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    })
    .map((category) => ({
      value: category.id,
      label: category.name,
    }));

  const handleCategorySelectForReorder = (categoryId: string) => {
    const categoryItems = items.filter((item) => item.categoryId === categoryId);
    setSelectedCategoryForReorder(categoryId);
    setReorderItemsList([...categoryItems].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    }));
  };

  const handleSaveReorder = async () => {
    if (!selectedCategoryForReorder || reorderItemsList.length === 0) return;

    try {
      setSavingOrder(true);
      const result = await reorderItems(dispensarySlug!, {
        items: reorderItemsList.map((item, index) => ({
          id: item.id,
          order: index,
        })),
      });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Ordre des objets mis à jour',
        color: 'green',
      });
      onClose();
      setSelectedCategoryForReorder(null);
      setReorderItemsList([]);
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
      setReorderItemsList((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedCategoryForReorder(null);
    setReorderItemsList([]);
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Réordonner les objets"
      size="md"
      radius="md"
    >
      <Stack>
        {!selectedCategoryForReorder ? (
          <>
            <Text size="sm" c="dimmed" mb="md">
              Sélectionnez une catégorie pour réordonner ses objets
            </Text>
            <Select
              label="Catégorie"
              placeholder="Choisir une catégorie"
              data={categoryOptions}
              searchable
              onChange={(value) => {
                if (value) {
                  handleCategorySelectForReorder(value);
                }
              }}
            />
          </>
        ) : (
          <>
            <Group justify="space-between" mb="md">
              <Text fw={500}>
                {categoryItems.find((c) => c.id === selectedCategoryForReorder)?.name || 'Catégorie'}
              </Text>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => {
                  setSelectedCategoryForReorder(null);
                  setReorderItemsList([]);
                }}
              >
                Changer de catégorie
              </Button>
            </Group>
            <Text size="sm" c="dimmed" mb="md">
              Glissez-déposez les objets pour les réordonner
            </Text>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleReorderDragEnd}
            >
              <SortableContext
                items={reorderItemsList.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <Stack gap="xs">
                  {reorderItemsList.map((item) => (
                    <SortableItemRow key={item.id} item={item} />
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
                disabled={reorderItemsList.length === 0}
              >
                Valider
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}


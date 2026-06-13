'use client';

import { useState, useEffect, useMemo } from 'react';
import {
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
import { SortableItemRow } from './SortableItemRow';
import type { ItemWithRelations } from '@/types/items';
import type { CategoryItemWithCount } from '@/types/categoryItems';
import { toCategorySelectOptions } from '@/lib/items/selectOptions';
import { sortItems } from '@/lib/stock/sortItemsByCategory';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type { useReorderItemsMutation } from '../hooks/useItemsQueries';

interface ReorderModalProps {
  opened: boolean;
  onClose: () => void;
  items: ItemWithRelations[];
  categoryItems: CategoryItemWithCount[];
  reorderMutation: ReturnType<typeof useReorderItemsMutation>;
}

export function ReorderModal({
  opened,
  onClose,
  items,
  categoryItems,
  reorderMutation,
}: ReorderModalProps) {
  const [selectedCategoryForReorder, setSelectedCategoryForReorder] = useState<string | null>(null);
  const [reorderItemsList, setReorderItemsList] = useState<ItemWithRelations[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const categoryOptions = useMemo(
    () => toCategorySelectOptions(categoryItems),
    [categoryItems],
  );

  useEffect(() => {
    if (!opened) {
      setSelectedCategoryForReorder(null);
      setReorderItemsList([]);
    }
  }, [opened]);

  const handleCategorySelectForReorder = (categoryId: string) => {
    const itemsInCategory = sortItems(items.filter((item) => item.categoryId === categoryId));
    setSelectedCategoryForReorder(categoryId);
    setReorderItemsList(itemsInCategory);
  };

  const handleSaveReorder = async () => {
    if (!selectedCategoryForReorder || reorderItemsList.length === 0) return;

    try {
      await reorderMutation.mutateAsync({
        items: reorderItemsList.map((item, index) => ({
          id: item.id,
          order: index,
        })),
      });
      onClose();
      setSelectedCategoryForReorder(null);
      setReorderItemsList([]);
    } catch {
      // Error notification handled by mutation
    }
  };

  const handleReorderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setReorderItemsList((current) => {
        const oldIndex = current.findIndex((item) => item.id === active.id);
        const newIndex = current.findIndex((item) => item.id === over.id);
        return arrayMove(current, oldIndex, newIndex);
      });
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedCategoryForReorder(null);
    setReorderItemsList([]);
  };

  const categoryName =
    categoryItems.find((c) => c.id === selectedCategoryForReorder)?.name || 'Catégorie';

  return (
    <AppModal
      opened={opened}
      onClose={handleClose}
      title="Réordonner les objets"
      size="md"
      footer={
        selectedCategoryForReorder ? (
          <AppModalFooter>
            <Button variant="subtle" color="slate" onClick={handleClose}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveReorder}
              loading={reorderMutation.isPending}
              disabled={reorderItemsList.length === 0}
            >
              Valider
            </Button>
          </AppModalFooter>
        ) : undefined
      }
    >
      {!selectedCategoryForReorder ? (
        <Stack>
          <Text size="sm" c="dimmed">
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
        </Stack>
      ) : (
        <Stack>
          <Group justify="space-between">
            <Text fw={500}>{categoryName}</Text>
            <Button
              variant="subtle"
              color="slate"
              size="xs"
              onClick={() => {
                setSelectedCategoryForReorder(null);
                setReorderItemsList([]);
              }}
            >
              Changer de catégorie
            </Button>
          </Group>
          <Text size="sm" c="dimmed">
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
        </Stack>
      )}
    </AppModal>
  );
}

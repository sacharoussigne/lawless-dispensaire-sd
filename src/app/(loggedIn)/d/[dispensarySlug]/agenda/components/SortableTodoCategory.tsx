'use client';

import { useState, type ReactNode } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  Popover,
  Stack,
  Text,
} from '@mantine/core';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconTrash } from '@tabler/icons-react';
import type { AgendaTodoCategoryDTO } from '@/types/agenda';
import { SortableTodoTask } from './SortableTodoTask';
import { InlineNoteInput } from './InlineNoteInput';
import { InlineEditableText } from './InlineEditableText';
import { stopDragPointer, usePressHoldPointerSensor } from './agendaDnd';
import classes from '../agenda.module.scss';

function SortableCategoryShell({
  category,
  canWrite,
  children,
  onDelete,
  onRename,
}: {
  category: AgendaTodoCategoryDTO;
  canWrite: boolean;
  children: ReactNode;
  onDelete: () => void;
  onRename: (id: string, name: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id, disabled: !canWrite || editing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={classes.todoCategory}>
      <div
        className={`${classes.todoCategoryHeader} ${
          canWrite && !editing ? classes.todoCategoryHeaderDraggable : ''
        }`}
        data-dragging={isDragging || undefined}
        {...(canWrite && !editing ? { ...attributes, ...listeners } : {})}
      >
        <InlineEditableText
          value={category.name}
          canEdit={canWrite}
          onSave={(name) => onRename(category.id, name)}
          textClassName={classes.todoCategoryTitle}
          inputClassName={classes.todoCategoryEditInput}
          onEditingChange={setEditing}
        />
        {canWrite && (
          <Popover
            position="left"
            withArrow
            shadow="md"
            opened={deleteConfirmOpen}
            onChange={setDeleteConfirmOpen}
          >
            <Popover.Target>
              <ActionIcon
                variant="subtle"
                color="danger"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                onPointerDown={stopDragPointer}
                aria-label="Supprimer la catégorie"
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="xs" className={classes.todoDeleteConfirm}>
                <Text size="sm" fw={500}>Supprimer la catégorie ?</Text>
                <Text size="xs" c="dimmed">
                  « {category.name} » et toutes ses tâches seront supprimées.
                </Text>
                <Group gap="xs" justify="flex-end" mt={4}>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="slate"
                    onClick={() => setDeleteConfirmOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="xs"
                    color="danger"
                    onClick={() => {
                      setDeleteConfirmOpen(false);
                      onDelete();
                    }}
                  >
                    Supprimer
                  </Button>
                </Group>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        )}
      </div>
      {children}
    </div>
  );
}

interface SortableTodoCategoryProps {
  category: AgendaTodoCategoryDTO;
  canWrite: boolean;
  onReorderTasks: (categoryId: string, taskIds: string[]) => void;
  onToggleTask: (id: string, completed: boolean) => void;
  onRenameTask: (id: string, title: string) => void | Promise<void>;
  onDeleteTask: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onRenameCategory: (id: string, name: string) => void | Promise<void>;
  onAddTask: (categoryId: string, title: string) => void;
}

export function SortableTodoCategory({
  category,
  canWrite,
  onReorderTasks,
  onToggleTask,
  onRenameTask,
  onDeleteTask,
  onDeleteCategory,
  onRenameCategory,
  onAddTask,
}: SortableTodoCategoryProps) {
  const sensors = useSensors(
    usePressHoldPointerSensor(),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = category.tasks.findIndex((t) => t.id === active.id);
    const newIndex = category.tasks.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(category.tasks, oldIndex, newIndex);
    onReorderTasks(
      category.id,
      reordered.map((t) => t.id),
    );
  };

  return (
    <SortableCategoryShell
      category={category}
      canWrite={canWrite}
      onDelete={() => onDeleteCategory(category.id)}
      onRename={onRenameCategory}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
        <SortableContext
          items={category.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <Stack gap={2}>
            {category.tasks.map((task) => (
              <SortableTodoTask
                key={task.id}
                task={task}
                canWrite={canWrite}
                onToggle={onToggleTask}
                onRename={onRenameTask}
                onDelete={onDeleteTask}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
      {canWrite && (
        <InlineNoteInput
          placeholder="Nouvelle tâche…"
          onSubmit={(title) => onAddTask(category.id, title)}
        />
      )}
    </SortableCategoryShell>
  );
}

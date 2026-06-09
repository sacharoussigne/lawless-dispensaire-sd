'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
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
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconGripVertical, IconTrash } from '@tabler/icons-react';
import type { AgendaTodoCategoryDTO } from '@/types/agenda';
import { SortableTodoTask } from './SortableTodoTask';
import classes from '../agenda.module.scss';

function SortableCategoryShell({
  category,
  canWrite,
  children,
  onDelete,
}: {
  category: AgendaTodoCategoryDTO;
  canWrite: boolean;
  children: ReactNode;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id, disabled: !canWrite });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={classes.todoCategory}>
      <Group justify="space-between" mb="xs" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          {canWrite && (
            <span className={classes.grip} {...attributes} {...listeners}>
              <IconGripVertical size={16} />
            </span>
          )}
          <Text fw={500} size="sm">{category.name}</Text>
        </Group>
        {canWrite && (
          <ActionIcon variant="subtle" color="danger" size="sm" onClick={onDelete}>
            <IconTrash size={14} />
          </ActionIcon>
        )}
      </Group>
      {children}
    </div>
  );
}

interface SortableTodoCategoryProps {
  category: AgendaTodoCategoryDTO;
  canWrite: boolean;
  onReorderTasks: (categoryId: string, taskIds: string[]) => void;
  onToggleTask: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onAddTask: (categoryId: string, title: string) => void;
}

export function SortableTodoCategory({
  category,
  canWrite,
  onReorderTasks,
  onToggleTask,
  onDeleteTask,
  onDeleteCategory,
  onAddTask,
}: SortableTodoCategoryProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor),
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
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
        <SortableContext
          items={category.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <Stack gap={4}>
            {category.tasks.map((task) => (
              <SortableTodoTask
                key={task.id}
                task={task}
                canWrite={canWrite}
                onToggle={onToggleTask}
                onDelete={onDeleteTask}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
      {canWrite && (
        <Group mt="xs">
          <TextInput
            size="xs"
            placeholder="Nouvelle tâche…"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.currentTarget.value)}
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTaskTitle.trim()) {
                onAddTask(category.id, newTaskTitle.trim());
                setNewTaskTitle('');
              }
            }}
          />
          <Button
            size="xs"
            color="sage"
            variant="light"
            onClick={() => {
              if (!newTaskTitle.trim()) return;
              onAddTask(category.id, newTaskTitle.trim());
              setNewTaskTitle('');
            }}
          >
            +
          </Button>
        </Group>
      )}
    </SortableCategoryShell>
  );
}

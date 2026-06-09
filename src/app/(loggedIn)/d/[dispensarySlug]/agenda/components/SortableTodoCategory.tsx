'use client';

import type { ReactNode } from 'react';
import {
  ActionIcon,
  Stack,
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
import { stopDragPointer, usePressHoldPointerSensor } from './agendaDnd';
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
      <div
        className={`${classes.todoCategoryHeader} ${
          canWrite ? classes.todoCategoryHeaderDraggable : ''
        }`}
        data-dragging={isDragging || undefined}
        {...(canWrite ? { ...attributes, ...listeners } : {})}
      >
        <span className={classes.todoCategoryTitle}>{category.name}</span>
        {canWrite && (
          <ActionIcon
            variant="subtle"
            color="danger"
            size="sm"
            onClick={onDelete}
            onPointerDown={stopDragPointer}
            aria-label="Supprimer la catégorie"
          >
            <IconTrash size={14} />
          </ActionIcon>
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

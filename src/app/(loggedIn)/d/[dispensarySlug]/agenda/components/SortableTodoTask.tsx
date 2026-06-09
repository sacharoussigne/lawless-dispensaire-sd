'use client';

import { useState } from 'react';
import { Checkbox, ActionIcon } from '@mantine/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconTrash } from '@tabler/icons-react';
import type { AgendaTodoTaskDTO } from '@/types/agenda';
import { stopDragPointer } from './agendaDnd';
import { InlineEditableText } from './InlineEditableText';
import classes from '../agenda.module.scss';

interface SortableTodoTaskProps {
  task: AgendaTodoTaskDTO;
  canWrite: boolean;
  dragEnabled?: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onRename: (id: string, title: string) => void | Promise<void>;
  onDelete: (id: string) => void;
}

export function SortableTodoTask({
  task,
  canWrite,
  dragEnabled = true,
  onToggle,
  onRename,
  onDelete,
}: SortableTodoTaskProps) {
  const [editing, setEditing] = useState(false);
  const canDrag = canWrite && dragEnabled;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: !canDrag || editing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${classes.todoTaskRow} ${canDrag && !editing ? classes.todoTaskRowDraggable : ''}`}
      data-dragging={isDragging || undefined}
      {...(canDrag && !editing ? { ...attributes, ...listeners } : {})}
    >
      <Checkbox
        checked={task.completed}
        onChange={(e) => onToggle(task.id, e.currentTarget.checked)}
        disabled={!canWrite}
        onPointerDown={stopDragPointer}
      />
      <InlineEditableText
        value={task.title}
        canEdit={canWrite}
        onSave={(title) => onRename(task.id, title)}
        textClassName={`${classes.todoTaskTitle} ${
          task.completed ? classes.todoTaskCompleted : ''
        }`}
        inputClassName={classes.todoTaskEditInput}
        onEditingChange={setEditing}
      />
      {canWrite && task.completed && !editing && (
        <ActionIcon
          variant="subtle"
          color="danger"
          size="sm"
          onClick={() => onDelete(task.id)}
          onPointerDown={stopDragPointer}
        >
          <IconTrash size={14} />
        </ActionIcon>
      )}
    </div>
  );
}

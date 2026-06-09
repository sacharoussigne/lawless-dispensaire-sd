'use client';

import { Checkbox, Group, Text, ActionIcon } from '@mantine/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconGripVertical, IconTrash } from '@tabler/icons-react';
import type { AgendaTodoTaskDTO } from '@/types/agenda';
import classes from '../agenda.module.scss';

interface SortableTodoTaskProps {
  task: AgendaTodoTaskDTO;
  canWrite: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

export function SortableTodoTask({
  task,
  canWrite,
  onToggle,
  onDelete,
}: SortableTodoTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: !canWrite });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={classes.todoTaskRow}>
      {canWrite && (
        <span className={classes.grip} {...attributes} {...listeners}>
          <IconGripVertical size={14} />
        </span>
      )}
      <Checkbox
        checked={task.completed}
        onChange={(e) => onToggle(task.id, e.currentTarget.checked)}
        disabled={!canWrite}
      />
      <Text
        size="sm"
        style={{ flex: 1 }}
        className={task.completed ? classes.todoTaskCompleted : undefined}
      >
        {task.title}
      </Text>
      {canWrite && task.completed && (
        <ActionIcon
          variant="subtle"
          color="danger"
          size="sm"
          onClick={() => onDelete(task.id)}
        >
          <IconTrash size={14} />
        </ActionIcon>
      )}
    </div>
  );
}

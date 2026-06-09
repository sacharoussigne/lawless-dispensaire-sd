'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Checkbox, Text, ActionIcon } from '@mantine/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconTrash } from '@tabler/icons-react';
import type { AgendaTodoTaskDTO } from '@/types/agenda';
import { stopDragPointer } from './agendaDnd';
import classes from '../agenda.module.scss';

interface SortableTodoTaskProps {
  task: AgendaTodoTaskDTO;
  canWrite: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onRename: (id: string, title: string) => void | Promise<void>;
  onDelete: (id: string) => void;
}

export function SortableTodoTask({
  task,
  canWrite,
  onToggle,
  onRename,
  onDelete,
}: SortableTodoTaskProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommit = useRef(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: !canWrite || editing });

  useEffect(() => {
    if (!editing) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [editing]);

  const commit = useCallback(async () => {
    const trimmed = value.trim();
    setEditing(false);
    if (!trimmed || trimmed === task.title) {
      setValue(task.title);
      return;
    }
    await onRename(task.id, trimmed);
  }, [value, task.id, task.title, onRename]);

  const cancel = () => {
    setEditing(false);
    setValue(task.title);
  };

  const startEditing = () => {
    if (!canWrite) return;
    setValue(task.title);
    setEditing(true);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${classes.todoTaskRow} ${canWrite && !editing ? classes.todoTaskRowDraggable : ''}`}
      data-dragging={isDragging || undefined}
      {...(canWrite && !editing ? { ...attributes, ...listeners } : {})}
    >
      <Checkbox
        checked={task.completed}
        onChange={(e) => onToggle(task.id, e.currentTarget.checked)}
        disabled={!canWrite}
        onPointerDown={stopDragPointer}
      />
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          className={classes.todoTaskEditInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPointerDown={stopDragPointer}
          onBlur={() => {
            if (skipBlurCommit.current) {
              skipBlurCommit.current = false;
              return;
            }
            void commit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              skipBlurCommit.current = true;
              void commit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              skipBlurCommit.current = true;
              cancel();
            }
          }}
        />
      ) : (
        <Text
          size="sm"
          style={{ flex: 1 }}
          className={`${classes.todoTaskTitle} ${
            task.completed ? classes.todoTaskCompleted : ''
          }`}
          onDoubleClick={(e) => {
            e.stopPropagation();
            startEditing();
          }}
        >
          {task.title}
        </Text>
      )}
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

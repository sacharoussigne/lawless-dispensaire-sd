'use client';

import type { MouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { stopDragPointer } from './agendaDnd';
import classes from '../agenda.module.scss';

interface InlineEditableTextProps {
  value: string;
  canEdit: boolean;
  onSave: (value: string) => void | Promise<void>;
  textClassName?: string;
  inputClassName?: string;
  onEditingChange?: (editing: boolean) => void;
}

export function InlineEditableText({
  value,
  canEdit,
  onSave,
  textClassName,
  inputClassName,
  onEditingChange,
}: InlineEditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommit = useRef(false);

  const setEditingState = useCallback(
    (next: boolean) => {
      setEditing(next);
      onEditingChange?.(next);
    },
    [onEditingChange],
  );

  useEffect(() => {
    if (!editing) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [editing]);

  const commit = useCallback(async () => {
    const trimmed = draft.trim();
    setEditingState(false);
    if (!trimmed || trimmed === value) {
      setDraft(value);
      return;
    }
    await onSave(trimmed);
  }, [draft, value, onSave, setEditingState]);

  const cancel = () => {
    setEditingState(false);
    setDraft(value);
  };

  const startEditing = (event: MouseEvent) => {
    event.stopPropagation();
    if (!canEdit) return;
    setDraft(value);
    setEditingState(true);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className={inputClassName ?? classes.inlineEditableInput}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onPointerDown={stopDragPointer}
        onClick={(e) => e.stopPropagation()}
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
    );
  }

  return (
    <span className={textClassName} onDoubleClick={startEditing}>
      {value}
    </span>
  );
}

'use client';

import { useState } from 'react';
import { InlineEditableText } from './InlineEditableText';
import classes from '../agenda.module.scss';

interface EditableTodoListTabProps {
  listId: string;
  name: string;
  active: boolean;
  canWrite: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void | Promise<void>;
}

export function EditableTodoListTab({
  listId,
  name,
  active,
  canWrite,
  onSelect,
  onRename,
}: EditableTodoListTabProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div
      role="tab"
      tabIndex={0}
      aria-selected={active}
      className={`${classes.todoListTab} ${active ? classes.todoListTabActive : ''} ${
        editing ? classes.todoListTabEditing : ''
      }`}
      onClick={() => {
        if (!editing) onSelect(listId);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !editing) onSelect(listId);
      }}
    >
      <InlineEditableText
        value={name}
        canEdit={canWrite}
        onSave={(nextName) => onRename(listId, nextName)}
        textClassName={classes.todoListTabLabel}
        inputClassName={classes.todoListTabEditInput}
        onEditingChange={setEditing}
      />
    </div>
  );
}

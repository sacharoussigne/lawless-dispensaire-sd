import type { CSSProperties } from 'react';

export function sortableRowStyles(isDragging: boolean): CSSProperties {
  return {
    padding: 'var(--mantine-spacing-sm)',
    marginBottom: 'var(--mantine-spacing-xs)',
    border: '1px solid var(--disp-surface-border)',
    borderRadius: 'var(--mantine-radius-md)',
    backgroundColor: isDragging ? 'var(--mantine-color-sage-0)' : 'var(--disp-surface)',
    boxShadow: isDragging ? 'var(--disp-shadow-card)' : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
  };
}

export const sortableRowGripStyle: CSSProperties = {
  cursor: 'inherit',
  display: 'flex',
  alignItems: 'center',
  color: 'var(--disp-ink-muted)',
};

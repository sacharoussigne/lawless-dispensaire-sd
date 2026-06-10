'use client';

import { ActionIcon, Group, Tooltip } from '@mantine/core';
import {
  IconArrowsDiagonalMinimize2,
  IconArrowsMaximize,
  IconCalendar,
  IconListCheck,
} from '@tabler/icons-react';
import type { AgendaLayoutPreference, AgendaWidthMode } from '@/lib/agenda/layoutPreference';
import classes from '../agenda.module.scss';

interface AgendaLayoutControlsProps {
  layout: AgendaLayoutPreference;
  canToggleCalendar: boolean;
  canToggleTodo: boolean;
  onWidthModeChange: (mode: AgendaWidthMode) => void;
  onToggleCalendar: () => void;
  onToggleTodo: () => void;
}

export function AgendaLayoutControls({
  layout,
  canToggleCalendar,
  canToggleTodo,
  onWidthModeChange,
  onToggleCalendar,
  onToggleTodo,
}: AgendaLayoutControlsProps) {
  const isExpanded = layout.widthMode === 'expanded';

  return (
    <Group gap={4} className={classes.agendaLayoutControls}>
      <Tooltip label={isExpanded ? 'Vue normale' : 'Vue étendue'} withArrow>
        <ActionIcon
          variant={isExpanded ? 'light' : 'subtle'}
          color="sage"
          aria-label={isExpanded ? 'Passer en vue normale' : 'Passer en vue étendue'}
          aria-pressed={isExpanded}
          onClick={() => onWidthModeChange(isExpanded ? 'normal' : 'expanded')}
        >
          {isExpanded ? <IconArrowsDiagonalMinimize2 size={18} /> : <IconArrowsMaximize size={18} />}
        </ActionIcon>
      </Tooltip>

      {canToggleCalendar && (
        <Tooltip label={layout.showCalendar ? 'Masquer le calendrier' : 'Afficher le calendrier'} withArrow>
          <ActionIcon
            variant={layout.showCalendar ? 'light' : 'subtle'}
            color="sage"
            aria-label={layout.showCalendar ? 'Masquer le calendrier' : 'Afficher le calendrier'}
            aria-pressed={layout.showCalendar}
            onClick={onToggleCalendar}
          >
            <IconCalendar size={18} />
          </ActionIcon>
        </Tooltip>
      )}

      {canToggleTodo && (
        <Tooltip label={layout.showTodo ? 'Masquer les tâches' : 'Afficher les tâches'} withArrow>
          <ActionIcon
            variant={layout.showTodo ? 'light' : 'subtle'}
            color="sage"
            aria-label={layout.showTodo ? 'Masquer les tâches' : 'Afficher les tâches'}
            aria-pressed={layout.showTodo}
            onClick={onToggleTodo}
          >
            <IconListCheck size={18} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}

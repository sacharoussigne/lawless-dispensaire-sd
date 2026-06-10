'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_AGENDA_LAYOUT,
  readAgendaLayoutPreference,
  writeAgendaLayoutPreference,
  type AgendaLayoutPreference,
  type AgendaWidthMode,
} from '@/lib/agenda/layoutPreference';

export function useAgendaLayoutPreference(dispensarySlug: string) {
  const [layout, setLayout] = useState<AgendaLayoutPreference>(DEFAULT_AGENDA_LAYOUT);

  useEffect(() => {
    setLayout(readAgendaLayoutPreference(dispensarySlug));
  }, [dispensarySlug]);

  const persist = useCallback(
    (updater: (prev: AgendaLayoutPreference) => AgendaLayoutPreference) => {
      setLayout((prev) => {
        const next = updater(prev);
        writeAgendaLayoutPreference(dispensarySlug, next);
        return next;
      });
    },
    [dispensarySlug],
  );

  const setWidthMode = useCallback(
    (widthMode: AgendaWidthMode) => {
      persist((prev) => ({ ...prev, widthMode }));
    },
    [persist],
  );

  const toggleCalendar = useCallback(() => {
    persist((prev) => {
      const nextShow = !prev.showCalendar;
      if (!nextShow && !prev.showTodo) return prev;
      return { ...prev, showCalendar: nextShow };
    });
  }, [persist]);

  const toggleTodo = useCallback(() => {
    persist((prev) => {
      const nextShow = !prev.showTodo;
      if (!nextShow && !prev.showCalendar) return prev;
      return { ...prev, showTodo: nextShow };
    });
  }, [persist]);

  return {
    layout,
    setWidthMode,
    toggleCalendar,
    toggleTodo,
  };
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { listAgendaTodoLists } from '@/app/_actions/agenda/todoLists';
import { handleAction } from '@/lib/action';
import { runAsyncEffect } from '@/lib/react/runAsyncEffect';
import type { AgendaTodoListDTO } from '@/types/agenda';
import { notifications } from '@mantine/notifications';

type UseAgendaTodoListsOptions = {
  dispensarySlug: string;
  agendaId: string | null;
  initialLists: AgendaTodoListDTO[];
  skipInitialFetch?: boolean;
  remoteTodosToken?: number;
  isDragging?: boolean;
};

function showListsLoadError(error: unknown) {
  notifications.show({
    title: 'Erreur',
    message: error instanceof Error ? error.message : 'Chargement impossible',
    color: 'danger',
  });
}

export function useAgendaTodoLists({
  dispensarySlug,
  agendaId,
  initialLists,
  skipInitialFetch = false,
  remoteTodosToken = 0,
  isDragging = false,
}: UseAgendaTodoListsOptions) {
  const skipInitialFetchRef = useRef(skipInitialFetch);
  const pendingRemoteReloadRef = useRef(false);
  const [lists, setLists] = useState<AgendaTodoListDTO[]>(initialLists);
  const [selectedListId, setSelectedListId] = useState<string | null>(
    initialLists[0]?.id ?? null,
  );
  const [syncedAgendaId, setSyncedAgendaId] = useState(agendaId);

  if (agendaId !== syncedAgendaId) {
    setSyncedAgendaId(agendaId);
    if (!agendaId) {
      setLists([]);
      setSelectedListId(null);
    }
  }

  const selectedList = lists.find((list) => list.id === selectedListId) ?? lists[0] ?? null;

  const applyLists = useCallback((data: AgendaTodoListDTO[]) => {
    setLists(data);
    setSelectedListId((current) =>
      current && data.some((list) => list.id === current)
        ? current
        : (data[0]?.id ?? null),
    );
  }, []);

  const fetchTodoLists = useCallback(async () => {
    if (!agendaId) return null;
    const result = await listAgendaTodoLists(dispensarySlug, agendaId);
    return handleAction(result) ?? null;
  }, [agendaId, dispensarySlug]);

  const reload = useCallback(async () => {
    if (!agendaId) return;
    try {
      const data = await fetchTodoLists();
      if (data) applyLists(data);
    } catch (error: unknown) {
      showListsLoadError(error);
    }
  }, [agendaId, applyLists, fetchTodoLists]);

  const fetchListsIntoState = useCallback(
    (isCancelled: () => boolean) => {
      runAsyncEffect(fetchTodoLists, {
        isCancelled,
        onSuccess: (data) => {
          if (data) applyLists(data);
        },
        onError: showListsLoadError,
      });
    },
    [applyLists, fetchTodoLists],
  );

  useEffect(() => {
    if (!agendaId) return;

    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    let cancelled = false;
    fetchListsIntoState(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [agendaId, fetchListsIntoState]);

  useEffect(() => {
    if (remoteTodosToken === 0) return;

    if (isDragging) {
      pendingRemoteReloadRef.current = true;
      return;
    }

    let cancelled = false;
    fetchListsIntoState(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [remoteTodosToken, fetchListsIntoState, isDragging]);

  useEffect(() => {
    if (isDragging || !pendingRemoteReloadRef.current) return;

    pendingRemoteReloadRef.current = false;

    let cancelled = false;
    fetchListsIntoState(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [isDragging, fetchListsIntoState]);

  return {
    lists,
    setLists,
    selectedListId,
    setSelectedListId,
    selectedList,
    reload,
    applyLists,
  };
}

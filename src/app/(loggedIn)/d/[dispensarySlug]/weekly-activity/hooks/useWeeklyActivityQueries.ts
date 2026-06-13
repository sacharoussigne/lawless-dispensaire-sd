'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { useRequiredDispensarySlug } from '@/app/_contexts/PermissionsContext';
import {
  createDispensaryWeeklyActivity,
  deleteDispensaryWeeklyActivity,
  getDispensaryWeeklyActivityHistory,
  listDispensaryWeeklyActivities,
  listDispensaryWeeklyActivityTargets,
  updateDispensaryWeeklyActivity,
} from '@/app/_actions/dispensaryWeeklyActivity';
import { handleAction } from '@/lib/action';
import { DEFAULT_STALE_TIME_MS } from '@/lib/react-query/QueryProvider';
import {
  isSameWeeklyActivityWeek,
  weeklyActivityWeekKey,
  type WeeklyActivityWeekBounds,
} from '@/lib/dispensaryWeeklyActivity/queryKeys';
import type { SerializedDispensaryWeeklyActivityRow } from '@/lib/dispensaryWeeklyActivity/apiRow';

export type WeeklyActivityListItem = SerializedDispensaryWeeklyActivityRow;

export type WeeklyActivityHistoryEntry = {
  id: string;
  action: string;
  source: string;
  actorUserName: string | null;
  actorResolvedName: string | null;
  actorDiscordUserId: string | null;
  createdAt: string;
};

export type WeeklyActivityTargetUser = {
  id: string;
  name: string;
  discordDisplayName: string;
};

export const weeklyActivityKeys = {
  all: (slug: string) => ['weeklyActivity', slug] as const,
  list: (slug: string, weekKey: string) =>
    [...weeklyActivityKeys.all(slug), 'list', weekKey] as const,
  history: (slug: string, activityId: string) =>
    [...weeklyActivityKeys.all(slug), 'history', activityId] as const,
  targets: (slug: string) => [...weeklyActivityKeys.all(slug), 'targets'] as const,
};

async function fetchWeeklyActivities(
  dispensarySlug: string,
  bounds: WeeklyActivityWeekBounds,
): Promise<WeeklyActivityListItem[]> {
  const result = await listDispensaryWeeklyActivities(dispensarySlug, bounds);
  const data = handleAction(result);
  return Array.isArray(data) ? data : [];
}

async function fetchWeeklyActivityHistory(
  dispensarySlug: string,
  activityId: string,
): Promise<WeeklyActivityHistoryEntry[]> {
  const result = await getDispensaryWeeklyActivityHistory(dispensarySlug, { id: activityId });
  const data = handleAction(result);
  return Array.isArray(data) ? data : [];
}

async function fetchWeeklyActivityTargets(
  dispensarySlug: string,
): Promise<WeeklyActivityTargetUser[]> {
  const result = await listDispensaryWeeklyActivityTargets(dispensarySlug);
  const data = handleAction(result) as { users?: WeeklyActivityTargetUser[] } | undefined;
  return data?.users ?? [];
}

export function useWeeklyActivities(
  weekBounds: WeeklyActivityWeekBounds | null,
  initialData?: {
    bounds: WeeklyActivityWeekBounds;
    rows: WeeklyActivityListItem[];
  },
) {
  const dispensarySlug = useRequiredDispensarySlug();
  const weekKey = weekBounds ? weeklyActivityWeekKey(weekBounds) : '';

  return useQuery({
    queryKey: weeklyActivityKeys.list(dispensarySlug, weekKey),
    queryFn: () => {
      if (!weekBounds) throw new Error('weekBounds is required');
      return fetchWeeklyActivities(dispensarySlug, weekBounds);
    },
    initialData:
      initialData &&
      weekBounds &&
      isSameWeeklyActivityWeek(initialData.bounds, weekBounds)
        ? initialData.rows
        : undefined,
    placeholderData: (previous) => previous,
    enabled: Boolean(dispensarySlug && weekBounds),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useWeeklyActivityHistory(activityId: string | null, enabled: boolean) {
  const dispensarySlug = useRequiredDispensarySlug();

  return useQuery({
    queryKey: weeklyActivityKeys.history(dispensarySlug, activityId ?? ''),
    queryFn: () => {
      if (!activityId) throw new Error('activityId is required');
      return fetchWeeklyActivityHistory(dispensarySlug, activityId);
    },
    enabled: Boolean(activityId && enabled),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useWeeklyActivityTargets(enabled: boolean) {
  const dispensarySlug = useRequiredDispensarySlug();

  return useQuery({
    queryKey: weeklyActivityKeys.targets(dispensarySlug),
    queryFn: () => fetchWeeklyActivityTargets(dispensarySlug),
    enabled: Boolean(dispensarySlug && enabled),
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

export function useInvalidateWeeklyActivities() {
  const queryClient = useQueryClient();
  const dispensarySlug = useRequiredDispensarySlug();

  return (bounds?: WeeklyActivityWeekBounds) => {
    if (bounds) {
      void queryClient.invalidateQueries({
        queryKey: weeklyActivityKeys.list(
          dispensarySlug,
          weeklyActivityWeekKey(bounds),
        ),
      });
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: weeklyActivityKeys.all(dispensarySlug),
    });
  };
}

export function useCreateWeeklyActivityMutation() {
  const dispensarySlug = useRequiredDispensarySlug();
  const invalidate = useInvalidateWeeklyActivities();

  return useMutation({
    mutationFn: async (vars: {
      payload: Parameters<typeof createDispensaryWeeklyActivity>[1];
      weekBounds: WeeklyActivityWeekBounds;
    }) => {
      const result = await createDispensaryWeeklyActivity(dispensarySlug, vars.payload);
      handleAction(result);
      return vars;
    },
    onSuccess: ({ weekBounds }) => {
      invalidate(weekBounds);
      notifications.show({ title: 'Créé', message: '', color: 'moss' });
    },
    onError: (error: Error) => {
      const message = error.message || 'Erreur';
      notifications.show({
        title: message.includes('existe déjà') ? 'Entrée déjà présente' : 'Erreur',
        message,
        color: message.includes('existe déjà') ? 'amber' : 'danger',
      });
    },
  });
}

export function useUpdateWeeklyActivityMutation() {
  const dispensarySlug = useRequiredDispensarySlug();
  const invalidate = useInvalidateWeeklyActivities();

  return useMutation({
    mutationFn: async (vars: {
      payload: Parameters<typeof updateDispensaryWeeklyActivity>[1];
      weekBounds: WeeklyActivityWeekBounds;
    }) => {
      const result = await updateDispensaryWeeklyActivity(dispensarySlug, vars.payload);
      handleAction(result);
      return vars;
    },
    onSuccess: ({ weekBounds }) => {
      invalidate(weekBounds);
      notifications.show({ title: 'Enregistré', message: '', color: 'moss' });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur',
        color: 'danger',
      });
    },
  });
}

export function useDeleteWeeklyActivityMutation() {
  const dispensarySlug = useRequiredDispensarySlug();
  const invalidate = useInvalidateWeeklyActivities();

  return useMutation({
    mutationFn: async (vars: { id: string; weekBounds: WeeklyActivityWeekBounds }) => {
      const result = await deleteDispensaryWeeklyActivity(dispensarySlug, { id: vars.id });
      handleAction(result);
      return vars;
    },
    onSuccess: ({ weekBounds }) => {
      invalidate(weekBounds);
      notifications.show({ title: 'Supprimé', message: '', color: 'moss' });
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur',
        color: 'danger',
      });
    },
  });
}

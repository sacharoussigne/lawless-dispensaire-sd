'use client';

import { Checkbox, Group, Text } from '@mantine/core';
import {
  WEEKDAY_KEYS,
  type WeekdayFlags,
  type WeekdayKey,
} from '@/lib/dispensaryWeeklyActivity/weekdayFlags';
import type { WeeklyActivityListItem } from './hooks/useWeeklyActivityQueries';

const DAY_SHORT: Record<WeekdayKey, string> = {
  lundi: 'Lun',
  mardi: 'Mar',
  mercredi: 'Mer',
  jeudi: 'Jeu',
  vendredi: 'Ven',
  samedi: 'Sam',
  dimanche: 'Dim',
};

export function DayFlagFields({
  title,
  flags,
  onToggle,
}: {
  title: string;
  flags: WeekdayFlags;
  onToggle: (key: WeekdayKey, value: boolean) => void;
}) {
  return (
    <div>
      <Text fw={600} size="sm" mb="xs">
        {title}
      </Text>
      <Group gap="md" wrap="wrap">
        {WEEKDAY_KEYS.map((k) => (
          <Checkbox
            key={k}
            label={DAY_SHORT[k]}
            checked={flags[k]}
            onChange={(e) => onToggle(k, e.currentTarget.checked)}
          />
        ))}
      </Group>
    </div>
  );
}

export type DoctorFilterOption = { value: string; label: string };

export function doctorKey(row: WeeklyActivityListItem): string {
  if (row.userId) return `user:${row.userId}`;
  if (row.discordUserId) return `discord:${row.discordUserId}`;
  return `name:${row.resolvedDisplayName}`;
}

export function compareWeeklyActivityRows(
  a: WeeklyActivityListItem,
  b: WeeklyActivityListItem,
  columnAccessor: string,
  direction: 'asc' | 'desc',
): number {
  const m = direction === 'asc' ? 1 : -1;
  let cmp = 0;

  if (columnAccessor === 'resolvedDisplayName') {
    cmp = a.resolvedDisplayName.localeCompare(b.resolvedDisplayName, 'fr', { sensitivity: 'base' });
  } else if (columnAccessor === 'periodStart') {
    cmp = new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime();
  } else if (columnAccessor === 'patientsCount') {
    cmp = a.patientsCount - b.patientsCount;
  } else if (columnAccessor === 'sherifCount') {
    cmp = a.sherifCount - b.sherifCount;
  } else if (columnAccessor === 'infusionsCount') {
    cmp = a.infusionsCount - b.infusionsCount;
  } else if (columnAccessor === 'poppyMilkCount') {
    cmp = a.poppyMilkCount - b.poppyMilkCount;
  } else if (columnAccessor === 'chestTotal') {
    cmp = a.chestTotal - b.chestTotal;
  } else if (columnAccessor === 'presenceTotal') {
    cmp = a.presenceTotal - b.presenceTotal;
  } else {
    return 0;
  }

  return cmp * m;
}

export function buildDoctorOptions(rows: WeeklyActivityListItem[]): DoctorFilterOption[] {
  const byKey = new Map<string, string>();
  for (const r of rows) {
    const k = doctorKey(r);
    if (!byKey.has(k)) {
      byKey.set(k, r.resolvedDisplayName);
    }
  }
  return [...byKey.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
}

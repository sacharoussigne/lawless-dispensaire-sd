'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button, Container, Group, Paper, Select } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DataTableSortStatus } from 'mantine-datatable';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { PageHeader } from '@/app/_components/PageHeader/PageHeader';
import { WeekNavigation } from '@/app/_components/WeekNavigation/WeekNavigation';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { addParisWeeks, getBankWeekBounds } from '@/lib/bankWeek';
import dayjs from '@/lib/dayjs';
import { weeklyActivityFieldVisibilityFromSettings } from '@/lib/dispensaryWeeklyActivity/fieldVisibility';
import type { WeeklyActivityWeekBounds } from '@/lib/dispensaryWeeklyActivity/queryKeys';
import { CreateWeeklyActivityModal } from './CreateWeeklyActivityModal';
import { EditWeeklyActivityModal } from './EditWeeklyActivityModal';
import { HistoryWeeklyActivityModal } from './HistoryWeeklyActivityModal';
import { WeeklyActivityTable } from './WeeklyActivityTable';
import {
  buildDoctorOptions,
  compareWeeklyActivityRows,
  doctorKey,
} from './weeklyActivityUtils';
import {
  useDeleteWeeklyActivityMutation,
  useWeeklyActivities,
  type WeeklyActivityListItem,
} from './hooks/useWeeklyActivityQueries';

export default function WeeklyActivityPageClient({
  initialWeekBounds,
  initialRows,
  canEditAll,
  canEdit,
  sessionUserId,
  viewerDiscordId,
  defaultDisplayName,
}: {
  initialWeekBounds: WeeklyActivityWeekBounds;
  initialRows: WeeklyActivityListItem[];
  canEditAll: boolean;
  canEdit: boolean;
  sessionUserId: string;
  viewerDiscordId: string | null;
  defaultDisplayName: string;
}) {
  const { appSettings } = usePermissions();
  const fieldVisibility = useMemo(
    () => weeklyActivityFieldVisibilityFromSettings(appSettings),
    [appSettings],
  );

  const defaultWeekMonday = useMemo(
    () => getBankWeekBounds(new Date()).start,
    [],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<WeeklyActivityListItem | null>(null);
  const [historyActivityId, setHistoryActivityId] = useState<string | null>(null);
  const [historyTitle, setHistoryTitle] = useState('');
  const [selectedDoctorKey, setSelectedDoctorKey] = useState<string | null>(null);
  const [periodWeekDateValue, setPeriodWeekDateValue] = useState<Date>(() =>
    getBankWeekBounds(dayjs().tz('Europe/Paris').startOf('day').toDate()).start,
  );
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<WeeklyActivityListItem>>({
    columnAccessor: 'periodStart',
    direction: 'desc',
  });

  const currentWeekBounds = useMemo(
    () => getBankWeekBounds(periodWeekDateValue),
    [periodWeekDateValue],
  );

  const queryWeekBounds = useMemo(
    (): WeeklyActivityWeekBounds => ({
      periodStart: currentWeekBounds.start,
      periodEnd: currentWeekBounds.end,
    }),
    [currentWeekBounds],
  );

  const { data: rows = [], isFetching } = useWeeklyActivities(queryWeekBounds, {
    bounds: initialWeekBounds,
    rows: initialRows,
  });

  const deleteMutation = useDeleteWeeklyActivityMutation();

  const doctorOptions = useMemo(() => buildDoctorOptions(rows), [rows]);

  const filteredRows = useMemo(() => {
    if (!selectedDoctorKey) return rows;
    return rows.filter((r) => doctorKey(r) === selectedDoctorKey);
  }, [rows, selectedDoctorKey]);

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort((a, b) =>
        compareWeeklyActivityRows(a, b, String(sortStatus.columnAccessor), sortStatus.direction),
      ),
    [filteredRows, sortStatus],
  );

  const handleOpenHistory = useCallback((row: WeeklyActivityListItem) => {
    setHistoryActivityId(row.id);
    setHistoryTitle(row.resolvedDisplayName);
  }, []);

  const handleDelete = useCallback(
    (row: WeeklyActivityListItem) => {
      void deleteMutation.mutateAsync({ id: row.id, weekBounds: queryWeekBounds });
    },
    [deleteMutation, queryWeekBounds],
  );

  const resetToCurrentWeek = () => {
    setPeriodWeekDateValue(
      getBankWeekBounds(dayjs().tz('Europe/Paris').startOf('day').toDate()).start,
    );
  };

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Activité hebdomadaire"
        actions={
          canEdit ? (
            <Button leftSection={<IconPlus size={18} />} onClick={() => setCreateOpen(true)}>
              Nouvelle entrée
            </Button>
          ) : undefined
        }
      />

      <Paper shadow="sm" p="md" withBorder radius="md" mt="xl">
        <ActiveFilters
          filters={[
            {
              label: 'Médecin',
              value: selectedDoctorKey,
              displayValue:
                (selectedDoctorKey
                  ? doctorOptions.find((o) => o.value === selectedDoctorKey)?.label ??
                    selectedDoctorKey
                  : null) ?? undefined,
              onRemove: () => setSelectedDoctorKey(null),
            },
            {
              label: 'Période',
              value: periodWeekDateValue.toISOString().slice(0, 10),
              displayValue: `Semaine du ${format(currentWeekBounds.start, 'd MMM', { locale: fr })} au ${format(currentWeekBounds.end, 'd MMM yyyy', { locale: fr })}`,
              onRemove: resetToCurrentWeek,
            },
          ]}
        />

        <Group gap="md" mb="md" wrap="wrap" align="flex-end">
          <Select
            label="Médecin"
            placeholder="Tous"
            data={doctorOptions}
            value={selectedDoctorKey}
            onChange={(v) => setSelectedDoctorKey(v || null)}
            searchable
            clearable
            nothingFoundMessage="Aucun résultat"
            style={{ minWidth: 260 }}
          />
          <WeekNavigation
            weekStart={currentWeekBounds.start}
            weekEnd={currentWeekBounds.end}
            weekDateValue={periodWeekDateValue}
            onWeekChange={(d) => {
              if (d) setPeriodWeekDateValue(d);
            }}
            onPreviousWeek={() =>
              setPeriodWeekDateValue((prev) => addParisWeeks(prev, -1))
            }
            onNextWeek={() => setPeriodWeekDateValue((prev) => addParisWeeks(prev, 1))}
          />
        </Group>

        <WeeklyActivityTable
          rows={sortedRows}
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          fieldVisibility={fieldVisibility}
          canEdit={canEdit}
          canEditAll={canEditAll}
          sessionUserId={sessionUserId}
          viewerDiscordId={viewerDiscordId}
          isFetching={isFetching}
          onOpenHistory={handleOpenHistory}
          onStartEdit={setEditRow}
          onDelete={handleDelete}
        />
      </Paper>

      <CreateWeeklyActivityModal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        canEditAll={canEditAll}
        defaultDisplayName={defaultDisplayName}
        defaultWeekMonday={defaultWeekMonday}
        fieldVisibility={fieldVisibility}
      />

      <EditWeeklyActivityModal
        row={editRow}
        onClose={() => setEditRow(null)}
        canEditAll={canEditAll}
        fieldVisibility={fieldVisibility}
        weekBounds={queryWeekBounds}
      />

      <HistoryWeeklyActivityModal
        activityId={historyActivityId}
        title={historyTitle}
        onClose={() => setHistoryActivityId(null)}
      />
    </Container>
  );
}

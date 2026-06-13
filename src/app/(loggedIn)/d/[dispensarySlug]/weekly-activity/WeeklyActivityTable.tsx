'use client';

import { useCallback, useMemo } from 'react';
import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { DataTable, type DataTableColumn, type DataTableSortStatus } from 'mantine-datatable';
import { IconHistory, IconPencil, IconTrash } from '@tabler/icons-react';
import {
  formatParisPeriodEndLabel,
  formatParisPeriodStartLabel,
} from '@/lib/dispensaryWeeklyActivity/parisPeriodLabels';
import type { WeeklyActivityFieldVisibility } from '@/lib/dispensaryWeeklyActivity/fieldVisibility';
import type { WeeklyActivityListItem } from './hooks/useWeeklyActivityQueries';

type WeeklyActivityTableProps = {
  rows: WeeklyActivityListItem[];
  sortStatus: DataTableSortStatus<WeeklyActivityListItem>;
  onSortStatusChange: (status: DataTableSortStatus<WeeklyActivityListItem>) => void;
  fieldVisibility: WeeklyActivityFieldVisibility;
  canEdit: boolean;
  canEditAll: boolean;
  sessionUserId: string;
  viewerDiscordId: string | null;
  isFetching: boolean;
  onOpenHistory: (row: WeeklyActivityListItem) => void;
  onStartEdit: (row: WeeklyActivityListItem) => void;
  onDelete: (row: WeeklyActivityListItem) => void;
};

export function WeeklyActivityTable({
  rows,
  sortStatus,
  onSortStatusChange,
  fieldVisibility,
  canEdit,
  canEditAll,
  sessionUserId,
  viewerDiscordId,
  isFetching,
  onOpenHistory,
  onStartEdit,
  onDelete,
}: WeeklyActivityTableProps) {
  const canEditRow = useCallback(
    (row: WeeklyActivityListItem) => {
      if (!canEdit) return false;
      if (canEditAll) return true;
      if (row.userId && row.userId === sessionUserId) return true;
      if (viewerDiscordId && row.discordUserId === viewerDiscordId) return true;
      return false;
    },
    [canEdit, canEditAll, sessionUserId, viewerDiscordId],
  );

  const confirmDelete = useCallback(
    (row: WeeklyActivityListItem) => {
      modals.openConfirmModal({
        title: 'Supprimer cette entrée ?',
        children: <Text size="sm">L’historique est conservé.</Text>,
        labels: { confirm: 'Supprimer', cancel: 'Annuler' },
        confirmProps: { color: 'danger' },
        onConfirm: () => onDelete(row),
      });
    },
    [onDelete],
  );

  const columns = useMemo((): DataTableColumn<WeeklyActivityListItem>[] => {
    const cols: DataTableColumn<WeeklyActivityListItem>[] = [
      {
        accessor: 'resolvedDisplayName',
        title: 'Médecin',
        sortable: true,
        render: (r) => r.resolvedDisplayName,
      },
      {
        accessor: 'periodStart',
        title: 'Période',
        sortable: true,
        render: (r) => (
          <Text size="sm">
            {formatParisPeriodStartLabel(new Date(r.periodStart))} —{' '}
            {formatParisPeriodEndLabel(new Date(r.periodEnd))}
          </Text>
        ),
      },
    ];
    if (fieldVisibility.chestDays) {
      cols.push({
        accessor: 'chestDaysSummary',
        title: 'Caisses',
        render: (r) => (
          <Tooltip label={`${r.chestTotal} jour(s) — L→D : ${r.chestDaysSummary}`}>
            <Text size="sm" ff="monospace">
              {r.chestDaysSummary}
            </Text>
          </Tooltip>
        ),
      });
    }
    if (fieldVisibility.presenceDays) {
      cols.push({
        accessor: 'presenceDaysSummary',
        title: 'Présences',
        render: (r) => (
          <Tooltip label={`${r.presenceTotal} jour(s) — L→D : ${r.presenceDaysSummary}`}>
            <Text size="sm" ff="monospace">
              {r.presenceDaysSummary}
            </Text>
          </Tooltip>
        ),
      });
    }
    if (fieldVisibility.patientsCount) {
      cols.push({ accessor: 'patientsCount', title: 'Patients', sortable: true });
    }
    if (fieldVisibility.sherifCount) {
      cols.push({ accessor: 'sherifCount', title: 'Shérifs', sortable: true });
    }
    if (fieldVisibility.infusionsCount) {
      cols.push({ accessor: 'infusionsCount', title: 'Infusions', sortable: true });
    }
    if (fieldVisibility.poppyMilkCount) {
      cols.push({ accessor: 'poppyMilkCount', title: 'Lait de pavot', sortable: true });
    }
    cols.push({
      accessor: 'actions',
      title: '',
      render: (r) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Historique">
            <ActionIcon variant="subtle" color="slate" onClick={() => onOpenHistory(r)} aria-label="Historique">
              <IconHistory size={18} />
            </ActionIcon>
          </Tooltip>
          {canEditRow(r) && (
            <>
              <Tooltip label="Modifier">
                <ActionIcon variant="subtle" color="slate" onClick={() => onStartEdit(r)} aria-label="Modifier">
                  <IconPencil size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Supprimer">
                <ActionIcon
                  color="danger"
                  variant="subtle"
                  onClick={() => confirmDelete(r)}
                  aria-label="Supprimer"
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Tooltip>
            </>
          )}
        </Group>
      ),
    });
    return cols;
  }, [fieldVisibility, canEditRow, onOpenHistory, onStartEdit, confirmDelete]);

  return (
    <DataTable
      records={rows}
      minHeight={200}
      sortStatus={sortStatus}
      onSortStatusChange={onSortStatusChange}
      fetching={isFetching}
      striped
      highlightOnHover
      noRecordsText="Aucune activité sur cette période"
      columns={columns}
    />
  );
}

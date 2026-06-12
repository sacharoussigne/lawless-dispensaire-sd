'use client';

import { useTenantRoutes } from '@/app/_contexts/PermissionsContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Button, Group, Paper, Select, Text, TextInput, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { IconEye, IconSearch, IconTrash } from '@tabler/icons-react';
import { WeekNavigation } from '@/app/_components/WeekNavigation/WeekNavigation';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { addParisWeeks, getBankWeekBounds } from '@/lib/bankWeek';
import { parsePickerDate } from '@/lib/date';
import {
  PAYROLL_REPORT_TYPE_EMPLOYES,
  PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE,
} from '@/lib/payroll/constants';
import {
  formatPayrollWeekRangeParis,
  getLatestPayrollListWeekMonday,
  isSamePayrollWeek,
} from '@/lib/payroll/week';
import {
  useDeletePayrollReportMutation,
  type PayrollReportListItem,
} from './hooks/usePayrollQueries';

const PAGE_SIZE = 10;

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function compareReportRows(
  a: PayrollReportListItem,
  b: PayrollReportListItem,
  columnAccessor: string,
  direction: 'asc' | 'desc',
): number {
  const m = direction === 'asc' ? 1 : -1;
  let cmp = 0;
  if (columnAccessor === 'weekStart') {
    cmp = new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime();
  } else if (columnAccessor === 'reportType') {
    cmp = a.reportType.localeCompare(b.reportType, 'fr', { sensitivity: 'base' });
  } else if (columnAccessor === 'createdBy.name') {
    cmp = a.createdBy.name.localeCompare(b.createdBy.name, 'fr', { sensitivity: 'base' });
  } else if (columnAccessor === 'patientsSoignes') {
    const valA =
      a.reportType === PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE
        ? -1
        : (a.summary?.totalPatientsSoignes ?? 0);
    const valB =
      b.reportType === PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE
        ? -1
        : (b.summary?.totalPatientsSoignes ?? 0);
    cmp = valA - valB;
  } else if (columnAccessor === 'sherifsSoignes') {
    const valA =
      a.reportType === PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE ? -1 : (a.summary?.totalSherifs ?? 0);
    const valB =
      b.reportType === PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE ? -1 : (b.summary?.totalSherifs ?? 0);
    cmp = valA - valB;
  } else {
    return 0;
  }
  return cmp * m;
}

export default function PayrollReportsList({
  reports,
  canDelete,
  isFetching = false,
}: {
  reports: PayrollReportListItem[];
  canDelete: boolean;
  isFetching?: boolean;
}) {
  const routes = useTenantRoutes();
  const deleteMutation = useDeletePayrollReportMutation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [weekFilterCleared, setWeekFilterCleared] = useState(false);
  const [weekDateValue, setWeekDateValue] = useState<Date | null>(() =>
    getLatestPayrollListWeekMonday(reports),
  );
  const defaultWeekApplied = useRef(weekDateValue !== null);

  useEffect(() => {
    if (weekFilterCleared || defaultWeekApplied.current) return;
    const latest = getLatestPayrollListWeekMonday(reports);
    if (!latest) return;
    setWeekDateValue(latest);
    defaultWeekApplied.current = true;
  }, [reports, weekFilterCleared]);
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<PayrollReportListItem>>({
    columnAccessor: 'weekStart',
    direction: 'desc',
  });

  const weekBounds = useMemo(
    () => (weekDateValue ? getBankWeekBounds(weekDateValue) : null),
    [weekDateValue],
  );

  const filteredReports = useMemo(() => {
    let result = reports;
    if (weekDateValue) {
      result = result.filter((r) => isSamePayrollWeek(r.weekStart, weekDateValue));
    }
    if (selectedType) {
      result = result.filter((r) => r.reportType === selectedType);
    }
    const q = searchQuery.trim();
    if (!q) return result;
    const nq = normalizeString(q);
    return result.filter((r) => {
      const weekLabel = `${format(new Date(r.weekStart), 'd MMM yyyy', { locale: fr })} ${format(new Date(r.weekEnd), 'd MMM yyyy', { locale: fr })}`;
      return (
        normalizeString(r.createdBy.name).includes(nq) ||
        normalizeString(weekLabel).includes(nq) ||
        r.weekStart.slice(0, 10).includes(q)
      );
    });
  }, [reports, weekDateValue, searchQuery, selectedType]);

  const sortedReports = useMemo(() => {
    return [...filteredReports].sort((a, b) =>
      compareReportRows(a, b, String(sortStatus.columnAccessor), sortStatus.direction),
    );
  }, [filteredReports, sortStatus]);

  const totalRecords = sortedReports.length;
  const maxPage = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE) || 1);
  const safePage = Math.min(page, maxPage);
  const paginatedReports = useMemo(
    () => sortedReports.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sortedReports, safePage],
  );

  const weekFilterLabel =
    weekBounds && formatPayrollWeekRangeParis(weekBounds.start, weekBounds.end);

  const confirmDelete = (r: PayrollReportListItem) => {
    modals.openConfirmModal({
      title: 'Supprimer ce rapport ?',
      children: <Text size="sm">Cette action est irréversible.</Text>,
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'danger' },
      onConfirm: () => deleteMutation.mutate(r.id),
    });
  };

  return (
    <>
      <ActiveFilters
        filters={[
          {
            label: 'Semaine',
            value: weekFilterLabel ?? '',
            onRemove: () => {
              setWeekFilterCleared(true);
              setWeekDateValue(null);
              setPage(1);
            },
          },
          {
            label: 'Recherche',
            value: searchQuery,
            onRemove: () => {
              setSearchQuery('');
              setPage(1);
            },
          },
          {
            label: 'Type',
            value: selectedType ?? '',
            onRemove: () => {
              setSelectedType(null);
              setPage(1);
            },
          },
        ]}
      />
      <Group gap="md" mb="md" wrap="wrap" align="flex-end">
        {weekDateValue && weekBounds ? (
          <WeekNavigation
            weekStart={weekBounds.start}
            weekEnd={weekBounds.end}
            weekDateValue={weekDateValue}
            onWeekChange={(date) => {
              const parsed = parsePickerDate(date);
              if (parsed) {
                setWeekDateValue(parsed);
                setPage(1);
              }
            }}
            onPreviousWeek={() => {
              setWeekDateValue((prev) => (prev ? addParisWeeks(prev, -1) : prev));
              setPage(1);
            }}
            onNextWeek={() => {
              setWeekDateValue((prev) => (prev ? addParisWeeks(prev, 1) : prev));
              setPage(1);
            }}
            loading={isFetching}
          />
        ) : (
          <Button
            variant="light"
            size="sm"
            onClick={() => {
              setWeekFilterCleared(false);
              setWeekDateValue(getLatestPayrollListWeekMonday(reports));
              setPage(1);
            }}
          >
            Filtrer par semaine
          </Button>
        )}
        {weekDateValue && (
          <Button
            variant="subtle"
            color="slate"
            size="sm"
            onClick={() => {
              setWeekFilterCleared(true);
              setWeekDateValue(null);
              setPage(1);
            }}
          >
            Toutes les semaines
          </Button>
        )}
        <TextInput
          placeholder="Rechercher…"
          leftSection={<IconSearch size={16} stroke={1.5} />}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.currentTarget.value);
            setPage(1);
          }}
          style={{ minWidth: 220, flex: 1 }}
        />
      </Group>
      <Paper shadow="sm" p="md" withBorder>
        <DataTable
          sortStatus={sortStatus}
          onSortStatusChange={(s) => {
            setSortStatus(s);
            setPage(1);
          }}
          records={paginatedReports}
          fetching={isFetching}
          columns={[
            {
              accessor: 'reportType',
              title: 'Type',
              sortable: true,
              filter: (
                <Select
                  placeholder="Tous les types"
                  data={[
                    { value: PAYROLL_REPORT_TYPE_EMPLOYES, label: PAYROLL_REPORT_TYPE_EMPLOYES },
                    {
                      value: PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE,
                      label: PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE,
                    },
                  ]}
                  value={selectedType}
                  onChange={(v) => {
                    setSelectedType(v);
                    setPage(1);
                  }}
                  clearable
                  size="xs"
                  style={{ minWidth: 180 }}
                />
              ),
              filtering: selectedType !== null,
              render: (r) => r.reportType,
            },
            {
              accessor: 'weekStart',
              title: 'Semaine',
              sortable: true,
              render: (r) => (
                <Text size="sm">
                  {formatPayrollWeekRangeParis(new Date(r.weekStart), new Date(r.weekEnd))}
                </Text>
              ),
            },
            {
              accessor: 'patientsSoignes',
              title: 'Patients soignés',
              sortable: true,
              render: (r) => {
                if (r.reportType === PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE) return '';
                return r.summary?.totalPatientsSoignes ?? 0;
              },
            },
            {
              accessor: 'sherifsSoignes',
              title: 'Shérifs soignés',
              sortable: true,
              render: (r) => {
                if (r.reportType === PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE) return '';
                return r.summary?.totalSherifs ?? 0;
              },
            },
            {
              accessor: 'createdBy.name',
              title: 'Créé par',
              sortable: true,
              render: (r) => r.createdBy.name,
            },
            {
              accessor: 'actions',
              title: '',
              render: (r) => (
                <Group gap="xs" wrap="nowrap" justify="flex-end">
                  <Tooltip label="Voir">
                    <Link href={routes.employee.payrollDetail(r.id)}>
                      <ActionIcon variant="subtle" color="slate" aria-label="Voir">
                        <IconEye size={18} />
                      </ActionIcon>
                    </Link>
                  </Tooltip>
                  {canDelete && (
                    <Tooltip label="Supprimer">
                      <ActionIcon
                        color="danger"
                        variant="subtle"
                        aria-label="Supprimer"
                        loading={deleteMutation.isPending}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          confirmDelete(r);
                        }}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              ),
            },
          ]}
          minHeight={200}
          noRecordsText={
            searchQuery.trim() || selectedType || weekDateValue
              ? 'Aucun rapport ne correspond à ces critères'
              : 'Aucun rapport pour le moment'
          }
          striped
          highlightOnHover
          page={safePage}
          onPageChange={setPage}
          totalRecords={totalRecords}
          recordsPerPage={PAGE_SIZE}
          paginationSize="sm"
          paginationText={({ from, to, totalRecords: tot }) => {
            const t = tot ?? 0;
            return `${from} - ${to} sur ${t} rapport${t > 1 ? 's' : ''}`;
          }}
        />
      </Paper>
    </>
  );
}

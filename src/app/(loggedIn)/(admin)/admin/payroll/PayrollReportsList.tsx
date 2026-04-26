'use client';

import { useMemo, useState } from 'react';
import { ActionIcon, Group, Paper, Text, TextInput, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { IconEye, IconTrash } from '@tabler/icons-react';
import { deletePayrollReport } from '@/app/_actions/payrollReports';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { handleAction } from '@/lib/action';
import { routes } from '@/types/routes';

const PAGE_SIZE = 20;

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
  } else {
    return 0;
  }
  return cmp * m;
}

export interface PayrollReportListItem {
  id: string;
  weekStart: string;
  weekEnd: string;
  reportType: string;
  createdAt: string;
  createdBy: { name: string; id: string };
}

export default function PayrollReportsList({
  reports,
  canDelete,
}: {
  reports: PayrollReportListItem[];
  canDelete: boolean;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<PayrollReportListItem>>({
    columnAccessor: 'weekStart',
    direction: 'desc',
  });

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return reports;
    const nq = normalizeString(q);
    return reports.filter((r) => {
      const weekLabel = `${format(new Date(r.weekStart), 'd MMM yyyy', { locale: fr })} ${format(new Date(r.weekEnd), 'd MMM yyyy', { locale: fr })}`;
      return (
        normalizeString(r.reportType).includes(nq) ||
        normalizeString(r.createdBy.name).includes(nq) ||
        normalizeString(weekLabel).includes(nq) ||
        r.weekStart.slice(0, 10).includes(q)
      );
    });
  }, [reports, searchQuery]);

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

  const confirmDelete = (r: PayrollReportListItem) => {
    modals.openConfirmModal({
      title: 'Supprimer ce rapport ?',
      children: <Text size="sm">Cette action est irréversible.</Text>,
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const result = await deletePayrollReport(r.id);
          handleAction(result);
          notifications.show({ title: 'Rapport supprimé', message: '', color: 'green' });
          router.refresh();
        } catch (e: unknown) {
          notifications.show({
            title: 'Erreur',
            message: e instanceof Error ? e.message : 'Erreur inconnue',
            color: 'red',
          });
        }
      },
    });
  };

  return (
    <>
      <ActiveFilters
        filters={[
          {
            label: 'Recherche',
            value: searchQuery,
            onRemove: () => setSearchQuery(''),
          },
        ]}
      />
      <Paper shadow="sm" p="md" withBorder>
        <DataTable
          sortStatus={sortStatus}
          onSortStatusChange={(s) => {
            setSortStatus(s);
            setPage(1);
          }}
          records={paginatedReports}
          columns={[
            {
              accessor: 'reportType',
              title: 'Type',
              sortable: true,
              filter: (
                <TextInput
                  placeholder="Type, auteur, semaine…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.currentTarget.value);
                    setPage(1);
                  }}
                  style={{ minWidth: 200 }}
                />
              ),
              filtering: searchQuery.trim() !== '',
              render: (r) => r.reportType,
            },
            {
              accessor: 'weekStart',
              title: 'Semaine',
              sortable: true,
              render: (r) => (
                <Text size="sm">
                  {format(new Date(r.weekStart), 'd MMM', { locale: fr })} —{' '}
                  {format(new Date(r.weekEnd), 'd MMM yyyy', { locale: fr })}
                </Text>
              ),
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
                    <Link href={`${routes.admin.payroll}/${r.id}`}>
                      <ActionIcon variant="subtle" aria-label="Voir">
                        <IconEye size={18} />
                      </ActionIcon>
                    </Link>
                  </Tooltip>
                  {canDelete && (
                    <Tooltip label="Supprimer">
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        aria-label="Supprimer"
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
            searchQuery.trim()
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

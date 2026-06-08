'use client';

import { usePermissions, useTenantRoutes } from '@/app/_contexts/PermissionsContext';
import { useMemo, useState } from 'react';
import { ActionIcon, Group, Paper, Select, Text, TextInput, Tooltip } from '@mantine/core';
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
import {
  PAYROLL_REPORT_TYPE_EMPLOYES,
  PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE,
} from '@/lib/payroll/constants';


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
  } else if (columnAccessor === 'patientsSoignes') {
    const valA = a.reportType === PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE ? -1 : (a.resultJson?.global_stats?.total_patients_soignes ?? 0);
    const valB = b.reportType === PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE ? -1 : (b.resultJson?.global_stats?.total_patients_soignes ?? 0);
    cmp = valA - valB;
  } else if (columnAccessor === 'sherifsSoignes') {
    const valA = a.reportType === PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE ? -1 : (a.resultJson?.global_stats?.total_sherifs ?? 0);
    const valB = b.reportType === PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE ? -1 : (b.resultJson?.global_stats?.total_sherifs ?? 0);
    cmp = valA - valB;
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
  resultJson?: any;
}

export default function PayrollReportsList({
  reports,
  canDelete,
}: {
  reports: PayrollReportListItem[];
  canDelete: boolean;
}) {
  const routes = useTenantRoutes();
  const { dispensarySlug } = usePermissions();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<PayrollReportListItem>>({
    columnAccessor: 'weekStart',
    direction: 'desc',
  });

  const filteredReports = useMemo(() => {
    let result = reports;
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
  }, [reports, searchQuery, selectedType]);

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
          const result = await deletePayrollReport(dispensarySlug!, r.id);
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
          {
            label: 'Type',
            value: selectedType ?? '',
            onRemove: () => setSelectedType(null),
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
                <Select
                  placeholder="Tous les types"
                  data={[
                    { value: PAYROLL_REPORT_TYPE_EMPLOYES, label: PAYROLL_REPORT_TYPE_EMPLOYES },
                    { value: PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE, label: PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE },
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
                  {format(new Date(r.weekStart), 'd MMM', { locale: fr })} —{' '}
                  {format(new Date(r.weekEnd), 'd MMM yyyy', { locale: fr })}
                </Text>
              ),
            },
            {
              accessor: 'patientsSoignes',
              title: 'Patients soignés',
              sortable: true,
              render: (r) => {
                if (r.reportType === PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE) return '';
                const result = r.resultJson;
                return result?.global_stats?.total_patients_soignes ?? 0;
              },
            },
            {
              accessor: 'sherifsSoignes',
              title: 'Shérifs soignés',
              sortable: true,
              render: (r) => {
                if (r.reportType === PAYROLL_REPORT_TYPE_PREPARATEURS_CAISSE) return '';
                const result = r.resultJson;
                return result?.global_stats?.total_sherifs ?? 0;
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


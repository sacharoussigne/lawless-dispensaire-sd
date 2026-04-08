'use client';

import { ActionIcon, Anchor, Group, Paper, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { IconTrash } from '@tabler/icons-react';
import { routes } from '@/types/routes';
export interface PayrollReportListItem {
  id: string;
  weekStart: string;
  weekEnd: string;
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

  const confirmDelete = (r: PayrollReportListItem) => {
    modals.openConfirmModal({
      title: 'Supprimer ce rapport ?',
      children: (
        <Text size="sm">Cette action est irréversible.</Text>
      ),
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/payroll-reports/${r.id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(typeof data.error === 'string' ? data.error : 'Échec de la suppression');
          }
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
    <Paper shadow="sm" p="md" withBorder>
      <DataTable
        records={reports}
        columns={[
          {
            accessor: 'weekStart',
            title: 'Semaine',
            render: (r) => (
              <Text size="sm">
                {format(new Date(r.weekStart), 'd MMM', { locale: fr })} —{' '}
                {format(new Date(r.weekEnd), 'd MMM yyyy', { locale: fr })}
              </Text>
            ),
          },
          {
            accessor: 'createdBy',
            title: 'Créé par',
            render: (r) => r.createdBy.name,
          },
          {
            accessor: 'createdAt',
            title: 'Créé le',
            render: (r) => format(new Date(r.createdAt), 'Pp', { locale: fr }),
          },
          {
            accessor: 'actions',
            title: '',
            render: (r) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                <Anchor component={Link} href={`${routes.admin.payroll}/${r.id}`} size="sm">
                  Voir
                </Anchor>
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
        noRecordsText="Aucun rapport pour le moment"
      />
    </Paper>
  );
}

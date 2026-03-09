'use client';

import { Paper, TextInput } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash, IconEye } from '@tabler/icons-react';
import { Group, ActionIcon } from '@mantine/core';
import type { Mail } from '@prisma/client';

interface MailsTableProps {
  mails: Mail[];
  loading: boolean;
  nameFilter: string;
  receiverFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  onNameFilterChange: (value: string) => void;
  onReceiverFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (mail: Mail) => void;
  onDelete: (mail: Mail) => void;
  onView: (mail: Mail) => void;
}

export function MailsTable({
  mails,
  loading,
  nameFilter,
  receiverFilter,
  page,
  pageSize,
  totalRecords,
  onNameFilterChange,
  onReceiverFilterChange,
  onPageChange,
  onEdit,
  onDelete,
  onView,
}: MailsTableProps) {
  return (
    <Paper shadow="sm" p="md" withBorder>
      <DataTable
        records={mails}
        columns={[
          {
            accessor: 'name',
            title: 'Nom',
            filter: (
              <TextInput
                placeholder="Rechercher un nom..."
                value={nameFilter}
                onChange={(e) => onNameFilterChange(e.currentTarget.value)}
                style={{ minWidth: 200 }}
              />
            ),
          },
          {
            accessor: 'receiver',
            title: 'Destinataire',
            filter: (
              <TextInput
                placeholder="Rechercher un destinataire..."
                value={receiverFilter}
                onChange={(e) => onReceiverFilterChange(e.currentTarget.value)}
                style={{ minWidth: 200 }}
              />
            ),
          },
          {
            accessor: 'content',
            title: 'Contenu',
            render: (mail: Mail) => {
              const preview = mail.content.length > 100
                ? mail.content.substring(0, 100) + '...'
                : mail.content;
              return <span title={mail.content}>{preview}</span>;
            },
          },
          {
            accessor: 'createdAt',
            title: 'Date',
            render: (mail: Mail) => {
              return new Date(mail.createdAt).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
            },
          },
          {
            accessor: 'actions',
            title: 'Actions',
            render: (mail: Mail) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                <ActionIcon
                  variant="light"
                  color="gray"
                  onClick={() => onView(mail)}
                  title="Voir"
                >
                  <IconEye size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => onEdit(mail)}
                  title="Modifier"
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="red"
                  onClick={() => onDelete(mail)}
                  title="Supprimer"
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ),
          },
        ]}
        fetching={loading}
        noRecordsText={
          nameFilter || receiverFilter
            ? 'Aucun courrier trouvé avec ces filtres'
            : 'Aucun courrier trouvé'
        }
        striped
        highlightOnHover
        minHeight={200}
        totalRecords={totalRecords}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={onPageChange}
        paginationSize="sm"
        paginationText={({ from, to, totalRecords }) =>
          `${from} - ${to} sur ${totalRecords} courriers`
        }
      />
    </Paper>
  );
}

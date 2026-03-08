'use client';

import { Paper, TextInput } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash, IconFlask } from '@tabler/icons-react';
import { Group, ActionIcon } from '@mantine/core';
import type { MailTemplate } from '@/types/mailTemplates';

interface MailTemplatesTableProps {
  mailTemplates: MailTemplate[];
  loading: boolean;
  nameFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  onNameFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (mailTemplate: MailTemplate) => void;
  onDelete: (mailTemplate: MailTemplate) => void;
  onTest?: (mailTemplate: MailTemplate) => void;
}

export function MailTemplatesTable({
  mailTemplates,
  loading,
  nameFilter,
  page,
  pageSize,
  totalRecords,
  onNameFilterChange,
  onPageChange,
  onEdit,
  onDelete,
  onTest,
}: MailTemplatesTableProps) {
  return (
    <Paper shadow="sm" p="md" withBorder>
      <DataTable
        records={mailTemplates}
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
            accessor: 'content',
            title: 'Contenu',
            render: (mailTemplate: MailTemplate) => {
              const preview = mailTemplate.content.length > 100
                ? mailTemplate.content.substring(0, 100) + '...'
                : mailTemplate.content;
              return <span title={mailTemplate.content}>{preview}</span>;
            },
          },
          {
            accessor: 'actions',
            title: 'Actions',
            render: (mailTemplate: MailTemplate) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                {onTest && (
                  <ActionIcon
                    variant="light"
                    color="green"
                    onClick={() => onTest(mailTemplate)}
                    title="Tester le template"
                  >
                    <IconFlask size={16} />
                  </ActionIcon>
                )}
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => onEdit(mailTemplate)}
                  title="Modifier"
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="red"
                  onClick={() => onDelete(mailTemplate)}
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
          nameFilter
            ? 'Aucun template trouvé avec ces filtres'
            : 'Aucun template trouvé'
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
          `${from} - ${to} sur ${totalRecords} templates`
        }
      />
    </Paper>
  );
}

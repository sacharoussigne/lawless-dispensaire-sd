'use client';

import { Paper, TextInput, Text } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash, IconFlask } from '@tabler/icons-react';
import { Group, ActionIcon } from '@mantine/core';

export type MailTemplateTableRow = {
  id: string;
  name: string;
  description?: string | null;
};

interface MailTemplatesTableProps<T extends MailTemplateTableRow> {
  mailTemplates: T[];
  loading: boolean;
  nameFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  onNameFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (mailTemplate: T) => void;
  onDelete: (mailTemplate: T) => void;
  onTest?: (mailTemplate: T) => void;
}

export function MailTemplatesTable<T extends MailTemplateTableRow>({
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
}: MailTemplatesTableProps<T>) {
  return (
    <Paper shadow="sm" p="md" withBorder w="100%">
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
            accessor: 'description',
            title: 'Description',
            render: (mailTemplate: T) => {
              if (!mailTemplate.description) {
                return (
                  <Text c="dimmed" span>
                    —
                  </Text>
                );
              }
              const preview =
                mailTemplate.description.length > 100
                  ? `${mailTemplate.description.substring(0, 100)}...`
                  : mailTemplate.description;
              return <span>{preview}</span>;
            },
          },
          {
            accessor: 'actions',
            title: 'Actions',
            width: 120,
            render: (mailTemplate: T) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                {onTest && (
                  <ActionIcon
                    variant="light"
                    color="moss"
                    onClick={() => onTest(mailTemplate)}
                    title="Tester le template"
                  >
                    <IconFlask size={16} />
                  </ActionIcon>
                )}
                <ActionIcon
                  variant="light"
                  color="slate"
                  onClick={() => onEdit(mailTemplate)}
                  title="Modifier"
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="danger"
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

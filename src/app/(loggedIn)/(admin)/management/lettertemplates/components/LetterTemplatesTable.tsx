'use client';

import { Paper, TextInput } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { Group, ActionIcon } from '@mantine/core';
import type { LetterTemplate } from '@/types/letterTemplates';

interface LetterTemplatesTableProps {
  letterTemplates: LetterTemplate[];
  loading: boolean;
  nameFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  onNameFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (letterTemplate: LetterTemplate) => void;
  onDelete: (letterTemplate: LetterTemplate) => void;
}

export function LetterTemplatesTable({
  letterTemplates,
  loading,
  nameFilter,
  page,
  pageSize,
  totalRecords,
  onNameFilterChange,
  onPageChange,
  onEdit,
  onDelete,
}: LetterTemplatesTableProps) {
  return (
    <Paper shadow="sm" p="md" withBorder>
      <DataTable
        records={letterTemplates}
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
            render: (letterTemplate: LetterTemplate) => {
              const preview = letterTemplate.content.length > 100
                ? letterTemplate.content.substring(0, 100) + '...'
                : letterTemplate.content;
              return <span title={letterTemplate.content}>{preview}</span>;
            },
          },
          {
            accessor: 'actions',
            title: 'Actions',
            render: (letterTemplate: LetterTemplate) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                <ActionIcon
                  variant="light"
                  color="blue"
                  onClick={() => onEdit(letterTemplate)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="red"
                  onClick={() => onDelete(letterTemplate)}
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

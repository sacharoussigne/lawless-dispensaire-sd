'use client';

import { Paper, TextInput, Group, ActionIcon, Badge, Text } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { apothecaryBooleanPills } from '@/lib/apothecaryPill';
import type { CompanyWithRelations } from '@/types/companies';

interface CompaniesTableProps {
  companies: CompanyWithRelations[];
  loading: boolean;
  nameFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  onNameFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (company: CompanyWithRelations) => void;
  onDelete: (company: CompanyWithRelations) => void;
}

export function CompaniesTable({
  companies,
  loading,
  nameFilter,
  page,
  pageSize,
  totalRecords,
  onNameFilterChange,
  onPageChange,
  onEdit,
  onDelete,
}: CompaniesTableProps) {
  return (
    <Paper shadow="sm" p="md" withBorder w="100%">
      <DataTable
        records={companies}
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
            accessor: 'companyGroups',
            title: "Groupes d'entreprises",
            render: (company: CompanyWithRelations) => (
              <Group gap="xs">
                {company.companyGroups.length === 0 ? (
                  <Text c="dimmed" size="sm">
                    -
                  </Text>
                ) : (
                  [...company.companyGroups]
                    .sort((a, b) =>
                      a.companyGroup.name.localeCompare(b.companyGroup.name, 'fr', {
                        sensitivity: 'base',
                      }),
                    )
                    .map((membership) => (
                    <Badge
                      key={membership.companyGroupId}
                      variant="outline"
                      radius="sm"
                      size="sm"
                      style={apothecaryBooleanPills.craft}
                    >
                      {membership.companyGroup.name}
                    </Badge>
                  ))
                )}
              </Group>
            ),
          },
          {
            accessor: 'actions',
            title: 'Actions',
            render: (company: CompanyWithRelations) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                <ActionIcon
                  variant="light"
                  color="slate"
                  onClick={() => onEdit(company)}
                  title="Modifier"
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="danger"
                  onClick={() => onDelete(company)}
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
            ? 'Aucune entreprise trouvée avec ces filtres'
            : 'Aucune entreprise trouvée'
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
          `${from} - ${to} sur ${totalRecords} entreprises`
        }
      />
    </Paper>
  );
}

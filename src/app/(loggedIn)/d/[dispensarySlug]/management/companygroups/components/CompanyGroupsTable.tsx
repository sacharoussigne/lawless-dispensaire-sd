'use client';

import { Paper, TextInput, Group, ActionIcon, Badge, Text } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { apothecaryBooleanPills } from '@/lib/apothecaryPill';
import type { CompanyGroupWithRelations } from '@/types/companyGroups';

interface CompanyGroupsTableProps {
  companyGroups: CompanyGroupWithRelations[];
  loading: boolean;
  nameFilter: string;
  descriptionFilter: string;
  page: number;
  pageSize: number;
  totalRecords: number;
  onNameFilterChange: (value: string) => void;
  onDescriptionFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onEdit: (companyGroup: CompanyGroupWithRelations) => void;
  onDelete: (companyGroup: CompanyGroupWithRelations) => void;
}

export function CompanyGroupsTable({
  companyGroups,
  loading,
  nameFilter,
  descriptionFilter,
  page,
  pageSize,
  totalRecords,
  onNameFilterChange,
  onDescriptionFilterChange,
  onPageChange,
  onEdit,
  onDelete,
}: CompanyGroupsTableProps) {
  return (
    <Paper shadow="sm" p="md" withBorder>
      <DataTable
        records={companyGroups}
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
            render: (companyGroup: CompanyGroupWithRelations) =>
              companyGroup.description || '-',
            filter: (
              <TextInput
                placeholder="Rechercher une description..."
                value={descriptionFilter}
                onChange={(e) => onDescriptionFilterChange(e.currentTarget.value)}
                style={{ minWidth: 200 }}
              />
            ),
          },
          {
            accessor: '_count.items',
            title: "Nombre d'items",
            render: (companyGroup: CompanyGroupWithRelations) =>
              companyGroup._count.items,
          },
          {
            accessor: 'companies',
            title: 'Entreprises',
            render: (companyGroup: CompanyGroupWithRelations) => (
              <Group gap="xs">
                {companyGroup.companies.length === 0 ? (
                  <Text c="dimmed" size="sm">
                    -
                  </Text>
                ) : (
                  companyGroup.companies.map((companyRelation) => {
                    const company = companyRelation.company;
                    if (!company) return null;
                    return (
                      <Badge
                        key={companyRelation.id}
                        variant="outline"
                        radius="sm"
                        size="sm"
                        style={apothecaryBooleanPills.commerce}
                      >
                        {company.name}
                      </Badge>
                    );
                  })
                )}
              </Group>
            ),
          },
          {
            accessor: 'actions',
            title: 'Actions',
            render: (companyGroup: CompanyGroupWithRelations) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                <ActionIcon
                  variant="light"
                  color="slate"
                  onClick={() => onEdit(companyGroup)}
                  title="Modifier"
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="danger"
                  onClick={() => onDelete(companyGroup)}
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
          nameFilter || descriptionFilter
            ? 'Aucun groupe d\'entreprises trouvé avec ces filtres'
            : 'Aucun groupe d\'entreprises trouvé'
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
          `${from} - ${to} sur ${totalRecords} groupes d'entreprises`
        }
      />
    </Paper>
  );
}


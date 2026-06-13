'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { CompanyGroupModal } from './components/CompanyGroupModal';
import { DeleteCompanyGroupModal } from './components/DeleteCompanyGroupModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { PageHeader } from '@/app/_components/PageHeader/PageHeader';
import { CompanyGroupsTable } from './components/CompanyGroupsTable';
import type { CompanyGroupWithRelations } from '@/types/companyGroups';
import type { CompanySelect } from '@/types/companies';
import { normalizeString } from '@/lib/string/normalizeString';
import { sortCompanyGroups } from '@/lib/companyGroups/sortCompanyGroups';
import { useCompaniesForSelect } from '../companies/hooks/useCompaniesQueries';
import {
  useManagementCompanyGroups,
  useCreateCompanyGroupMutation,
  useUpdateCompanyGroupMutation,
  useDeleteCompanyGroupMutation,
} from './hooks/useCompanyGroupsQueries';

interface CompanyGroupsPageClientProps {
  initialCompanyGroups: CompanyGroupWithRelations[];
  initialCompanies: CompanySelect[];
}

export default function CompanyGroupsPageClient({
  initialCompanyGroups,
  initialCompanies,
}: CompanyGroupsPageClientProps) {
  const { data: companyGroups = [], isFetching } = useManagementCompanyGroups(initialCompanyGroups);
  const { data: companies = [] } = useCompaniesForSelect(initialCompanies);
  const createMutation = useCreateCompanyGroupMutation();
  const updateMutation = useUpdateCompanyGroupMutation();
  const deleteMutation = useDeleteCompanyGroupMutation();

  const [modalOpened, setModalOpened] = useState(false);
  const [editingCompanyGroup, setEditingCompanyGroup] = useState<CompanyGroupWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [companyGroupToDelete, setCompanyGroupToDelete] = useState<CompanyGroupWithRelations | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { paginatedCompanyGroups, totalRecords } = useMemo(() => {
    const filtered = companyGroups.filter((companyGroup) => {
      const matchesName =
        !nameFilter ||
        normalizeString(companyGroup.name).includes(normalizeString(nameFilter));
      const matchesDescription =
        !descriptionFilter ||
        (companyGroup.description &&
          normalizeString(companyGroup.description).includes(
            normalizeString(descriptionFilter),
          ));
      return matchesName && matchesDescription;
    });
    const sorted = sortCompanyGroups(filtered);
    return {
      paginatedCompanyGroups: sorted.slice((page - 1) * pageSize, page * pageSize),
      totalRecords: sorted.length,
    };
  }, [companyGroups, nameFilter, descriptionFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [nameFilter, descriptionFilter]);

  const handleEdit = (companyGroup: CompanyGroupWithRelations) => {
    setEditingCompanyGroup(companyGroup);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingCompanyGroup(null);
    setModalOpened(true);
  };

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Groupes d'entreprises"
        description="Regroupez les entreprises par structure pour simplifier le suivi et les conventions."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Créer un groupe d'entreprises
          </Button>
        }
      />

      <ActiveFilters
        filters={[
          {
            label: 'Nom',
            value: nameFilter,
            onRemove: () => setNameFilter(''),
          },
          {
            label: 'Description',
            value: descriptionFilter,
            onRemove: () => setDescriptionFilter(''),
          },
        ]}
      />

      <CompanyGroupsTable
        companyGroups={paginatedCompanyGroups}
        loading={isFetching}
        nameFilter={nameFilter}
        descriptionFilter={descriptionFilter}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onNameFilterChange={(value) => setNameFilter(value)}
        onDescriptionFilterChange={(value) => setDescriptionFilter(value)}
        onPageChange={(p) => setPage(p)}
        onEdit={handleEdit}
        onDelete={(companyGroup) => {
          setCompanyGroupToDelete(companyGroup);
          setDeleteModalOpened(true);
        }}
      />

      <CompanyGroupModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingCompanyGroup(null);
        }}
        editingCompanyGroup={editingCompanyGroup}
        companies={companies}
        createMutation={createMutation}
        updateMutation={updateMutation}
      />

      <DeleteCompanyGroupModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setCompanyGroupToDelete(null);
        }}
        companyGroupToDelete={companyGroupToDelete}
        deleteMutation={deleteMutation}
      />
    </Container>
  );
}

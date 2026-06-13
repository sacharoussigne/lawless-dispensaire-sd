'use client';

import { useEffect, useMemo, useState } from 'react';
import { Container, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { CompanyModal } from './components/CompanyModal';
import { DeleteCompanyModal } from './components/DeleteCompanyModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { PageHeader } from '@/app/_components/PageHeader/PageHeader';
import { CompaniesTable } from './components/CompaniesTable';
import type { CompanyWithRelations } from '@/types/companies';
import type { CompanyGroupSelect } from '@/types/items';
import { normalizeString } from '@/lib/string/normalizeString';
import { sortCompanies } from '@/lib/companies/sortCompanies';
import { useCompanyGroupsForSelect } from '../companygroups/hooks/useCompanyGroupsQueries';
import {
  useManagementCompanies,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
} from './hooks/useCompaniesQueries';

interface CompaniesPageClientProps {
  initialCompanies: CompanyWithRelations[];
  initialCompanyGroups: CompanyGroupSelect[];
}

export default function CompaniesPageClient({
  initialCompanies,
  initialCompanyGroups,
}: CompaniesPageClientProps) {
  const { data: companies = [], isFetching } = useManagementCompanies(initialCompanies);
  const { data: companyGroups = [] } = useCompanyGroupsForSelect(initialCompanyGroups);
  const createMutation = useCreateCompanyMutation();
  const updateMutation = useUpdateCompanyMutation();
  const deleteMutation = useDeleteCompanyMutation();

  const [modalOpened, setModalOpened] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyWithRelations | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { paginatedCompanies, totalRecords } = useMemo(() => {
    const filtered = companies.filter((company) => {
      if (!nameFilter) return true;
      return normalizeString(company.name).includes(normalizeString(nameFilter));
    });
    const sorted = sortCompanies(filtered);
    return {
      paginatedCompanies: sorted.slice((page - 1) * pageSize, page * pageSize),
      totalRecords: sorted.length,
    };
  }, [companies, nameFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  const handleEdit = (company: CompanyWithRelations) => {
    setEditingCompany(company);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingCompany(null);
    setModalOpened(true);
  };

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Entreprises"
        description="Référentiel des entreprises liées aux groupes et aux objets."
        actions={
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Créer une entreprise
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
        ]}
      />

      <CompaniesTable
        companies={paginatedCompanies}
        loading={isFetching}
        nameFilter={nameFilter}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onNameFilterChange={(value) => setNameFilter(value)}
        onPageChange={(p) => setPage(p)}
        onEdit={handleEdit}
        onDelete={(company) => {
          setCompanyToDelete(company);
          setDeleteModalOpened(true);
        }}
      />

      <CompanyModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingCompany(null);
        }}
        editingCompany={editingCompany}
        companyGroups={companyGroups}
        createMutation={createMutation}
        updateMutation={updateMutation}
      />

      <DeleteCompanyModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setCompanyToDelete(null);
        }}
        companyToDelete={companyToDelete}
        deleteMutation={deleteMutation}
      />
    </Container>
  );
}

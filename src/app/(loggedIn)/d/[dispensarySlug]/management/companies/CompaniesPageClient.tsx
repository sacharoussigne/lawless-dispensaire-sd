'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useEffect, useState } from 'react';
import { Container, Title, Group, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { getCompanies } from '@/app/_actions/companies';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { CompanyModal } from './components/CompanyModal';
import { DeleteCompanyModal } from './components/DeleteCompanyModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { CompaniesTable } from './components/CompaniesTable';
import type { CompanyWithRelations } from '@/types/companies';
import { ManagementSectionThemeProvider } from '../ManagementSectionThemeProvider';

interface CompaniesPageClientProps {
  initialCompanies: CompanyWithRelations[];
}

// Fonction pour normaliser les chaînes (enlever les accents et mettre en minuscule)
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function CompaniesPageClient({
  initialCompanies,
}: CompaniesPageClientProps) {
  const { dispensarySlug } = usePermissions();
  const [companies, setCompanies] = useState<CompanyWithRelations[]>(initialCompanies);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyWithRelations | null>(null);

  const [nameFilter, setNameFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const result = await getCompanies(dispensarySlug!, );
      const data = handleAction(result);
      if (data) {
        setCompanies(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des entreprises',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (company: CompanyWithRelations) => {
    setEditingCompany(company);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingCompany(null);
    setModalOpened(true);
  };

  // Filtrer les entreprises par nom
  const filteredCompanies = companies.filter((company) => {
    const matchesName =
      !nameFilter ||
      normalizeString(company.name).includes(normalizeString(nameFilter));
    return matchesName;
  });

  // Trier par nom
  const sortedCompanies = [...filteredCompanies].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );

  // Calculer la pagination
  const totalRecords = sortedCompanies.length;
  const paginatedCompanies = sortedCompanies.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  return (
    <ManagementSectionThemeProvider section="companies">
      <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Entreprises</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer une entreprise
        </Button>
      </Group>

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
        loading={loading}
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
        onSuccess={loadCompanies}
      />

      <DeleteCompanyModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setCompanyToDelete(null);
        }}
        companyToDelete={companyToDelete}
        onSuccess={loadCompanies}
      />
      </Container>
    </ManagementSectionThemeProvider>
  );
}


'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { getCompanyGroups } from '@/app/_actions/companyGroups';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { CompanyGroupModal } from './components/CompanyGroupModal';
import { DeleteCompanyGroupModal } from './components/DeleteCompanyGroupModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { CompanyGroupsTable } from './components/CompanyGroupsTable';
import type { CompanyGroupWithRelations, CompanyWithRelations } from '@/types/companyGroups';

interface CompanyGroupsPageClientProps {
  initialCompanyGroups: CompanyGroupWithRelations[];
  initialCompanies: CompanyWithRelations[];
}

// Fonction pour normaliser les chaînes (enlever les accents et mettre en minuscule)
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function CompanyGroupsPageClient({
  initialCompanyGroups,
  initialCompanies,
}: CompanyGroupsPageClientProps) {
  const [companyGroups, setCompanyGroups] = useState<CompanyGroupWithRelations[]>(initialCompanyGroups);
  const [companies] = useState<CompanyWithRelations[]>(initialCompanies);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingCompanyGroup, setEditingCompanyGroup] = useState<CompanyGroupWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [companyGroupToDelete, setCompanyGroupToDelete] = useState<CompanyGroupWithRelations | null>(null);

  const [nameFilter, setNameFilter] = useState<string>('');
  const [descriptionFilter, setDescriptionFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const loadCompanyGroups = async () => {
    try {
      setLoading(true);
      const result = await getCompanyGroups();
      const data = handleAction(result);
      if (data) {
        setCompanyGroups(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des groupes d\'entreprises',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (companyGroup: CompanyGroupWithRelations) => {
    setEditingCompanyGroup(companyGroup);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingCompanyGroup(null);
    setModalOpened(true);
  };

  // Filtrer les groupes d'entreprises par nom et description
  const filteredCompanyGroups = companyGroups.filter((companyGroup) => {
    const matchesName =
      !nameFilter ||
      normalizeString(companyGroup.name).includes(normalizeString(nameFilter));
    const matchesDescription =
      !descriptionFilter ||
      (companyGroup.description &&
        normalizeString(companyGroup.description).includes(
          normalizeString(descriptionFilter)
        ));
    return matchesName && matchesDescription;
  });

  // Trier par nom
  const sortedCompanyGroups = [...filteredCompanyGroups].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );

  // Calculer la pagination
  const totalRecords = sortedCompanyGroups.length;
  const paginatedCompanyGroups = sortedCompanyGroups.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [nameFilter, descriptionFilter]);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Groupes d'entreprises</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer un groupe d'entreprises
        </Button>
      </Group>

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
        loading={loading}
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
        onSuccess={loadCompanyGroups}
      />

      <DeleteCompanyGroupModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setCompanyGroupToDelete(null);
        }}
        companyGroupToDelete={companyGroupToDelete}
        onSuccess={loadCompanyGroups}
      />
    </Container>
  );
}


'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { getLetterTemplates } from '@/app/_actions/letterTemplates';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { LetterTemplateModal } from './components/LetterTemplateModal';
import { DeleteLetterTemplateModal } from './components/DeleteLetterTemplateModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { LetterTemplatesTable } from './components/LetterTemplatesTable';
import type { LetterTemplate } from '@/types/letterTemplates';

interface LetterTemplatesPageClientProps {
  initialLetterTemplates: LetterTemplate[];
}

// Fonction pour normaliser les chaînes (enlever les accents et mettre en minuscule)
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function LetterTemplatesPageClient({
  initialLetterTemplates,
}: LetterTemplatesPageClientProps) {
  const [letterTemplates, setLetterTemplates] = useState<LetterTemplate[]>(initialLetterTemplates);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingLetterTemplate, setEditingLetterTemplate] = useState<LetterTemplate | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [letterTemplateToDelete, setLetterTemplateToDelete] = useState<LetterTemplate | null>(null);

  const [nameFilter, setNameFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const loadLetterTemplates = async () => {
    try {
      setLoading(true);
      const result = await getLetterTemplates();
      const data = handleAction(result);
      if (data) {
        setLetterTemplates(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des templates de lettres',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (letterTemplate: LetterTemplate) => {
    setEditingLetterTemplate(letterTemplate);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingLetterTemplate(null);
    setModalOpened(true);
  };

  // Filtrer les templates par nom
  const filteredLetterTemplates = letterTemplates.filter((letterTemplate) => {
    const matchesName =
      !nameFilter ||
      normalizeString(letterTemplate.name).includes(normalizeString(nameFilter));
    return matchesName;
  });

  // Trier par nom
  const sortedLetterTemplates = [...filteredLetterTemplates].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );

  // Calculer la pagination
  const totalRecords = sortedLetterTemplates.length;
  const paginatedLetterTemplates = sortedLetterTemplates.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Templates de lettres</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer un template
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

      <LetterTemplatesTable
        letterTemplates={paginatedLetterTemplates}
        loading={loading}
        nameFilter={nameFilter}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onNameFilterChange={(value) => setNameFilter(value)}
        onPageChange={(p) => setPage(p)}
        onEdit={handleEdit}
        onDelete={(letterTemplate) => {
          setLetterTemplateToDelete(letterTemplate);
          setDeleteModalOpened(true);
        }}
      />

      <LetterTemplateModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingLetterTemplate(null);
        }}
        editingLetterTemplate={editingLetterTemplate}
        onSuccess={loadLetterTemplates}
      />

      <DeleteLetterTemplateModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setLetterTemplateToDelete(null);
        }}
        letterTemplateToDelete={letterTemplateToDelete}
        onSuccess={loadLetterTemplates}
      />
    </Container>
  );
}

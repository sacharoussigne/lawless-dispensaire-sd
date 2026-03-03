'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
  Tabs,
  Stack,
} from '@mantine/core';
import { IconPlus, IconTemplate, IconLink } from '@tabler/icons-react';
import { getLetterTemplates } from '@/app/_actions/letterTemplates';
import { getOrderLetterTemplateAssignments } from '@/app/_actions/orderLetterTemplateAssignments';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { LetterTemplateModal } from './components/LetterTemplateModal';
import { DeleteLetterTemplateModal } from './components/DeleteLetterTemplateModal';
import { OrderLetterTemplateAssignmentModal } from './components/OrderLetterTemplateAssignmentModal';
import { DeleteOrderLetterTemplateAssignmentModal } from './components/DeleteOrderLetterTemplateAssignmentModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { LetterTemplatesTable } from './components/LetterTemplatesTable';
import { OrderLetterTemplateAssignmentsTable } from './components/OrderLetterTemplateAssignmentsTable';
import type { LetterTemplate } from '@/types/letterTemplates';
import type { OrderLetterTemplateAssignment } from '@prisma/client';

interface OrderLetterTemplateAssignmentWithTemplate extends OrderLetterTemplateAssignment {
  letterTemplate: {
    id: string;
    name: string;
  };
}

interface LetterTemplatesPageClientProps {
  initialLetterTemplates: LetterTemplate[];
  initialAssignments: OrderLetterTemplateAssignmentWithTemplate[];
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
  initialAssignments,
}: LetterTemplatesPageClientProps) {
  const [letterTemplates, setLetterTemplates] = useState<LetterTemplate[]>(initialLetterTemplates);
  const [assignments, setAssignments] = useState<OrderLetterTemplateAssignmentWithTemplate[]>(initialAssignments);
  const [loading, setLoading] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingLetterTemplate, setEditingLetterTemplate] = useState<LetterTemplate | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [letterTemplateToDelete, setLetterTemplateToDelete] = useState<LetterTemplate | null>(null);
  const [assignmentModalOpened, setAssignmentModalOpened] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<OrderLetterTemplateAssignmentWithTemplate | null>(null);
  const [deleteAssignmentModalOpened, setDeleteAssignmentModalOpened] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<OrderLetterTemplateAssignmentWithTemplate | null>(null);

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

  const loadAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const result = await getOrderLetterTemplateAssignments();
      const data = handleAction(result);
      if (data) {
        setAssignments(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des assignations',
        color: 'red',
      });
    } finally {
      setAssignmentsLoading(false);
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

  const handleEditAssignment = (assignment: OrderLetterTemplateAssignmentWithTemplate) => {
    setEditingAssignment(assignment);
    setAssignmentModalOpened(true);
  };

  const openCreateAssignmentModal = () => {
    setEditingAssignment(null);
    setAssignmentModalOpened(true);
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
      <Title order={1} mb="xl">Templates de lettres</Title>

      <Tabs defaultValue="templates">
        <Tabs.List>
          <Tabs.Tab value="templates" leftSection={<IconTemplate size={16} />}>
            Templates
          </Tabs.Tab>
          <Tabs.Tab value="assignments" leftSection={<IconLink size={16} />}>
            Assignations
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="templates" pt="xl">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2}>Gestion des templates</Title>
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
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="assignments" pt="xl">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2}>Assignations de templates</Title>
              <Button leftSection={<IconPlus size={16} />} onClick={openCreateAssignmentModal}>
                Créer une assignation
              </Button>
            </Group>

            <OrderLetterTemplateAssignmentsTable
              assignments={assignments}
              loading={assignmentsLoading}
              onEdit={handleEditAssignment}
              onDelete={(assignment) => {
                setAssignmentToDelete(assignment);
                setDeleteAssignmentModalOpened(true);
              }}
            />
          </Stack>
        </Tabs.Panel>
      </Tabs>

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

      <OrderLetterTemplateAssignmentModal
        opened={assignmentModalOpened}
        onClose={() => {
          setAssignmentModalOpened(false);
          setEditingAssignment(null);
        }}
        editingAssignment={editingAssignment}
        letterTemplates={letterTemplates}
        onSuccess={loadAssignments}
      />

      <DeleteOrderLetterTemplateAssignmentModal
        opened={deleteAssignmentModalOpened}
        onClose={() => {
          setDeleteAssignmentModalOpened(false);
          setAssignmentToDelete(null);
        }}
        assignmentToDelete={assignmentToDelete}
        onSuccess={loadAssignments}
      />
    </Container>
  );
}

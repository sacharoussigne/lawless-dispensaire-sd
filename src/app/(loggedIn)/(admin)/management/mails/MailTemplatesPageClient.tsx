'use client';

import { useEffect, useState } from 'react';
import { Container, Title, Group, Button, Tabs, Stack } from '@mantine/core';
import { IconPlus, IconTemplate, IconLink } from '@tabler/icons-react';
import { getMailTemplates } from '@/app/_actions/mailTemplates';
import { getOrderLetterTemplateAssignments } from '@/app/_actions/orderLetterTemplateAssignments';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { MailTemplateModal } from './components/MailTemplateModal';
import { DeleteMailTemplateModal } from './components/DeleteMailTemplateModal';
import { OrderLetterTemplateAssignmentModal } from './components/OrderLetterTemplateAssignmentModal';
import { DeleteOrderLetterTemplateAssignmentModal } from './components/DeleteOrderLetterTemplateAssignmentModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { MailTemplatesTable } from './components/MailTemplatesTable';
import { OrderLetterTemplateAssignmentsTable } from './components/OrderLetterTemplateAssignmentsTable';
import type { MailTemplate } from '@/types/mailTemplates';
import type { OrderLetterTemplateAssignment } from '@prisma/client';
import { ManagementSectionThemeProvider } from '../ManagementSectionThemeProvider';

interface OrderLetterTemplateAssignmentWithTemplate extends OrderLetterTemplateAssignment {
  letterTemplate: {
    id: string;
    name: string;
  };
}

interface MailTemplatesPageClientProps {
  initialMailTemplates: MailTemplate[];
  initialAssignments: OrderLetterTemplateAssignmentWithTemplate[];
}

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function MailTemplatesPageClient({
  initialMailTemplates,
  initialAssignments,
}: MailTemplatesPageClientProps) {
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>(initialMailTemplates);
  const [assignments, setAssignments] = useState<OrderLetterTemplateAssignmentWithTemplate[]>(initialAssignments);
  const [loading, setLoading] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingMailTemplate, setEditingMailTemplate] = useState<MailTemplate | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [mailTemplateToDelete, setMailTemplateToDelete] = useState<MailTemplate | null>(null);
  const [assignmentModalOpened, setAssignmentModalOpened] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<OrderLetterTemplateAssignmentWithTemplate | null>(null);
  const [deleteAssignmentModalOpened, setDeleteAssignmentModalOpened] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<OrderLetterTemplateAssignmentWithTemplate | null>(null);

  const [nameFilter, setNameFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const loadMailTemplates = async () => {
    try {
      setLoading(true);
      const result = await getMailTemplates();
      const data = handleAction(result);
      if (data) {
        setMailTemplates(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des modèles de courriers',
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

  const handleEdit = (mailTemplate: MailTemplate) => {
    setEditingMailTemplate(mailTemplate);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingMailTemplate(null);
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

  const filteredMailTemplates = mailTemplates.filter((mailTemplate) => {
    const matchesName =
      !nameFilter ||
      normalizeString(mailTemplate.name).includes(normalizeString(nameFilter));
    return matchesName;
  });

  const sortedMailTemplates = [...filteredMailTemplates].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );

  const totalRecords = sortedMailTemplates.length;
  const paginatedMailTemplates = sortedMailTemplates.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  return (
    <ManagementSectionThemeProvider section="mails">
      <Container size="xl" py="xl">
      <Title order={1} mb="xl">Courriers</Title>

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
              <Title order={2}>Gestion des modèles</Title>
              <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
                Créer un modèle
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

            <MailTemplatesTable
              mailTemplates={paginatedMailTemplates}
              loading={loading}
              nameFilter={nameFilter}
              page={page}
              pageSize={pageSize}
              totalRecords={totalRecords}
              onNameFilterChange={(value) => setNameFilter(value)}
              onPageChange={(p) => setPage(p)}
              onEdit={handleEdit}
              onDelete={(mailTemplate) => {
                setMailTemplateToDelete(mailTemplate);
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

      <MailTemplateModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingMailTemplate(null);
        }}
        editingMailTemplate={editingMailTemplate}
        onSuccess={loadMailTemplates}
      />

      <DeleteMailTemplateModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setMailTemplateToDelete(null);
        }}
        mailTemplateToDelete={mailTemplateToDelete}
        onSuccess={loadMailTemplates}
      />

      <OrderLetterTemplateAssignmentModal
        opened={assignmentModalOpened}
        onClose={() => {
          setAssignmentModalOpened(false);
          setEditingAssignment(null);
        }}
        editingAssignment={editingAssignment}
        mailTemplates={mailTemplates}
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
    </ManagementSectionThemeProvider>
  );
}

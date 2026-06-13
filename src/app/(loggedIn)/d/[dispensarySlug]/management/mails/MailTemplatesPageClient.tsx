'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container, Title, Group, Button, Tabs, Stack } from '@mantine/core';
import { IconPlus, IconTemplate, IconLink } from '@tabler/icons-react';
import { MailTemplateModal } from './components/MailTemplateModal';
import { DeleteMailTemplateModal } from './components/DeleteMailTemplateModal';
import { OrderLetterTemplateAssignmentModal } from './components/OrderLetterTemplateAssignmentModal';
import { DeleteOrderLetterTemplateAssignmentModal } from './components/DeleteOrderLetterTemplateAssignmentModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { MailTemplatesTable } from '@/app/_components/mails/MailTemplatesTable';
import { OrderLetterTemplateAssignmentsTable } from './components/OrderLetterTemplateAssignmentsTable';
import type { MailTemplateListItem } from '@/types/mailTemplates';
import { normalizeString } from '@/lib/string/normalizeString';
import {
  useManagementMailTemplates,
  useOrderLetterTemplateAssignments,
  useCreateMailTemplateMutation,
  useUpdateMailTemplateMutation,
  useDeleteMailTemplateMutation,
  useCreateOrderLetterAssignmentMutation,
  useUpdateOrderLetterAssignmentMutation,
  useDeleteOrderLetterAssignmentMutation,
  type OrderLetterTemplateAssignmentWithTemplate,
} from './hooks/useMailTemplatesQueries';

interface MailTemplatesPageClientProps {
  initialMailTemplates: MailTemplateListItem[];
  initialAssignments: OrderLetterTemplateAssignmentWithTemplate[];
}

export default function MailTemplatesPageClient({
  initialMailTemplates,
  initialAssignments,
}: MailTemplatesPageClientProps) {
  const { data: mailTemplates = [], isFetching } = useManagementMailTemplates(initialMailTemplates);
  const { data: assignments = [], isFetching: assignmentsFetching } =
    useOrderLetterTemplateAssignments(initialAssignments);

  const createTemplateMutation = useCreateMailTemplateMutation();
  const updateTemplateMutation = useUpdateMailTemplateMutation();
  const deleteTemplateMutation = useDeleteMailTemplateMutation();
  const createAssignmentMutation = useCreateOrderLetterAssignmentMutation();
  const updateAssignmentMutation = useUpdateOrderLetterAssignmentMutation();
  const deleteAssignmentMutation = useDeleteOrderLetterAssignmentMutation();

  const [modalOpened, setModalOpened] = useState(false);
  const [editingMailTemplate, setEditingMailTemplate] = useState<MailTemplateListItem | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [mailTemplateToDelete, setMailTemplateToDelete] = useState<MailTemplateListItem | null>(null);
  const [assignmentModalOpened, setAssignmentModalOpened] = useState(false);
  const [editingAssignment, setEditingAssignment] =
    useState<OrderLetterTemplateAssignmentWithTemplate | null>(null);
  const [deleteAssignmentModalOpened, setDeleteAssignmentModalOpened] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] =
    useState<OrderLetterTemplateAssignmentWithTemplate | null>(null);

  const [nameFilter, setNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { paginatedMailTemplates, totalRecords } = useMemo(() => {
    const filtered = mailTemplates.filter((mailTemplate) => {
      if (!nameFilter) return true;
      return normalizeString(mailTemplate.name).includes(normalizeString(nameFilter));
    });
    const sorted = [...filtered].sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    );
    return {
      paginatedMailTemplates: sorted.slice((page - 1) * pageSize, page * pageSize),
      totalRecords: sorted.length,
    };
  }, [mailTemplates, nameFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  const handleEdit = useCallback((mailTemplate: MailTemplateListItem) => {
    setEditingMailTemplate(mailTemplate);
    setModalOpened(true);
  }, []);

  const handleDelete = useCallback((mailTemplate: MailTemplateListItem) => {
    setMailTemplateToDelete(mailTemplate);
    setDeleteModalOpened(true);
  }, []);

  const handleEditAssignment = useCallback((assignment: OrderLetterTemplateAssignmentWithTemplate) => {
    setEditingAssignment(assignment);
    setAssignmentModalOpened(true);
  }, []);

  const handleDeleteAssignment = useCallback(
    (assignment: OrderLetterTemplateAssignmentWithTemplate) => {
      setAssignmentToDelete(assignment);
      setDeleteAssignmentModalOpened(true);
    },
    [],
  );

  const handleNameFilterChange = useCallback((value: string) => {
    setNameFilter(value);
  }, []);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, []);

  const openCreateModal = () => {
    setEditingMailTemplate(null);
    setModalOpened(true);
  };

  const openCreateAssignmentModal = () => {
    setEditingAssignment(null);
    setAssignmentModalOpened(true);
  };

  return (
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
              loading={isFetching}
              nameFilter={nameFilter}
              page={page}
              pageSize={pageSize}
              totalRecords={totalRecords}
              onNameFilterChange={handleNameFilterChange}
              onPageChange={handlePageChange}
              onEdit={handleEdit}
              onDelete={handleDelete}
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
              loading={assignmentsFetching}
              onEdit={handleEditAssignment}
              onDelete={handleDeleteAssignment}
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
        createMutation={createTemplateMutation}
        updateMutation={updateTemplateMutation}
      />

      <DeleteMailTemplateModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setMailTemplateToDelete(null);
        }}
        mailTemplateToDelete={mailTemplateToDelete}
        deleteMutation={deleteTemplateMutation}
      />

      <OrderLetterTemplateAssignmentModal
        opened={assignmentModalOpened}
        onClose={() => {
          setAssignmentModalOpened(false);
          setEditingAssignment(null);
        }}
        editingAssignment={editingAssignment}
        mailTemplates={mailTemplates}
        createMutation={createAssignmentMutation}
        updateMutation={updateAssignmentMutation}
      />

      <DeleteOrderLetterTemplateAssignmentModal
        opened={deleteAssignmentModalOpened}
        onClose={() => {
          setDeleteAssignmentModalOpened(false);
          setAssignmentToDelete(null);
        }}
        assignmentToDelete={assignmentToDelete}
        deleteMutation={deleteAssignmentMutation}
      />
    </Container>
  );
}

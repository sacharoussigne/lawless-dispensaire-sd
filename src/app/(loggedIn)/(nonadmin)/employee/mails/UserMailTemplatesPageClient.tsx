'use client';

import { useEffect, useState } from 'react';
import { Container, Title, Group, Button, Stack } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { getUserMailTemplates } from '@/app/_actions/mailTemplates';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { UserMailTemplateModal } from './components/UserMailTemplateModal';
import { DeleteUserMailTemplateModal } from './components/DeleteUserMailTemplateModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { MailTemplatesTable } from '@/app/(loggedIn)/(admin)/management/mails/components/MailTemplatesTable';
import type { MailTemplate } from '@/types/mailTemplates';

interface UserMailTemplatesPageClientProps {
  initialMailTemplates: MailTemplate[];
}

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function UserMailTemplatesPageClient({
  initialMailTemplates,
}: UserMailTemplatesPageClientProps) {
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>(initialMailTemplates);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingMailTemplate, setEditingMailTemplate] = useState<MailTemplate | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [mailTemplateToDelete, setMailTemplateToDelete] = useState<MailTemplate | null>(null);

  const [nameFilter, setNameFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const loadMailTemplates = async () => {
    try {
      setLoading(true);
      const result = await getUserMailTemplates();
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

  const handleEdit = (mailTemplate: MailTemplate) => {
    setEditingMailTemplate(mailTemplate);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingMailTemplate(null);
    setModalOpened(true);
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
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Mes templates de courriers</Title>

      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>Gestion de mes modèles</Title>
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

      <UserMailTemplateModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingMailTemplate(null);
        }}
        editingMailTemplate={editingMailTemplate}
        onSuccess={loadMailTemplates}
      />

      <DeleteUserMailTemplateModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setMailTemplateToDelete(null);
        }}
        mailTemplateToDelete={mailTemplateToDelete}
        onSuccess={loadMailTemplates}
      />
    </Container>
  );
}

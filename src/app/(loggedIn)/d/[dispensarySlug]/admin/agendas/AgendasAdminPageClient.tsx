'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Button,
  Container,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconPlus, IconTrash, IconUsers } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { PageHeader } from '@/app/_components/PageHeader/PageHeader';
import { listAgendasForAdmin } from '@/app/_actions/agenda/agendas';
import { handleAction } from '@/lib/action';
import { AgendaFormModal } from './components/AgendaFormModal';
import { AgendaMembersModal } from './components/AgendaMembersModal';
import { DeleteAgendaModal } from './components/DeleteAgendaModal';

type AdminAgenda = {
  id: string;
  name: string;
  description: string | null;
  _count: { members: number };
};

interface AgendasAdminPageClientProps {
  dispensarySlug: string;
  initialAgendas: AdminAgenda[];
  error?: string;
}

export function AgendasAdminPageClient({
  dispensarySlug,
  initialAgendas,
  error,
}: AgendasAdminPageClientProps) {
  const [agendas, setAgendas] = useState(initialAgendas);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAgenda | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersAgenda, setMembersAgenda] = useState<AdminAgenda | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAgenda, setDeleteAgenda] = useState<AdminAgenda | null>(null);

  const reload = async () => {
    try {
      const result = await listAgendasForAdmin(dispensarySlug);
      const data = handleAction(result);
      if (data) setAgendas(data as AdminAgenda[]);
    } catch (err: unknown) {
      notifications.show({
        title: 'Erreur',
        message: err instanceof Error ? err.message : 'Rechargement impossible',
        color: 'red',
      });
    }
  };

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Agendas"
        description="Créer et gérer les agendas partagés du dispensaire."
        actions={
          <Button
            color="sage"
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Nouvel agenda
          </Button>
        }
      />

      {error && (
        <Text c="dimmed" mb="md">{error}</Text>
      )}

      <DataTable
        withTableBorder
        borderRadius="sm"
        highlightOnHover
        records={agendas}
        columns={[
          { accessor: 'name', title: 'Nom' },
          {
            accessor: 'description',
            title: 'Description',
            render: (a) => a.description || '—',
          },
          {
            accessor: '_count.members',
            title: 'Membres',
            render: (a) => a._count.members,
          },
          {
            accessor: 'actions',
            title: '',
            textAlign: 'right',
            render: (a) => (
              <Group gap="xs" justify="flex-end" wrap="nowrap">
                <ActionIcon
                  variant="light"
                  color="slate"
                  onClick={() => {
                    setEditing(a);
                    setFormOpen(true);
                  }}
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="leather"
                  onClick={() => {
                    setMembersAgenda(a);
                    setMembersOpen(true);
                  }}
                >
                  <IconUsers size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="danger"
                  onClick={() => {
                    setDeleteAgenda(a);
                    setDeleteOpen(true);
                  }}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ),
          },
        ]}
        emptyState={
          <Stack align="center" py="xl">
            <Text c="dimmed">Aucun agenda. Créez-en un pour commencer.</Text>
          </Stack>
        }
      />

      <AgendaFormModal
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        dispensarySlug={dispensarySlug}
        agenda={editing}
        onSuccess={reload}
      />

      <AgendaMembersModal
        opened={membersOpen}
        onClose={() => setMembersOpen(false)}
        dispensarySlug={dispensarySlug}
        agendaId={membersAgenda?.id ?? null}
        agendaName={membersAgenda?.name ?? ''}
      />

      <DeleteAgendaModal
        opened={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        dispensarySlug={dispensarySlug}
        agendaId={deleteAgenda?.id ?? null}
        agendaName={deleteAgenda?.name ?? ''}
        onSuccess={reload}
      />
    </Container>
  );
}

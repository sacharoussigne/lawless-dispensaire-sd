'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Title, Group, Button, Stack, Tabs } from '@mantine/core';
import { IconPlus, IconTemplate, IconMail } from '@tabler/icons-react';
import { getUserMailTemplates } from '@/app/_actions/mailTemplates';
import { getMails } from '@/app/_actions/mails';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { DeleteUserMailTemplateModal } from './components/DeleteUserMailTemplateModal';
import { DeleteMailModal } from './components/DeleteMailModal';
import { ViewMailModal } from './components/ViewMailModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { MailTemplatesTable } from '@/app/(loggedIn)/(admin)/management/mails/components/MailTemplatesTable';
import { MailsTable } from './components/MailsTable';
import type { MailTemplate } from '@/types/mailTemplates';
import type { Mail } from '@prisma/client';
import { routes } from '@/types/routes';

interface UserMailTemplatesPageClientProps {
  initialMailTemplates: MailTemplate[];
  initialMails: Mail[];
}

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function UserMailTemplatesPageClient({
  initialMailTemplates,
  initialMails,
}: UserMailTemplatesPageClientProps) {
  const router = useRouter();
  const [mailTemplates, setMailTemplates] = useState<MailTemplate[]>(initialMailTemplates);
  const [mails, setMails] = useState<Mail[]>(initialMails);
  const [loading, setLoading] = useState(false);
  const [mailsLoading, setMailsLoading] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [mailTemplateToDelete, setMailTemplateToDelete] = useState<MailTemplate | null>(null);
  const [deleteMailModalOpened, setDeleteMailModalOpened] = useState(false);
  const [mailToDelete, setMailToDelete] = useState<Mail | null>(null);
  const [viewMailModalOpened, setViewMailModalOpened] = useState(false);
  const [mailToView, setMailToView] = useState<Mail | null>(null);

  const [nameFilter, setNameFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [mailNameFilter, setMailNameFilter] = useState<string>('');
  const [receiverFilter, setReceiverFilter] = useState<string>('');
  const [mailPage, setMailPage] = useState(1);

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

  const loadMails = async () => {
    try {
      setMailsLoading(true);
      const result = await getMails();
      const data = handleAction(result);
      if (data) {
        setMails(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des courriers',
        color: 'red',
      });
    } finally {
      setMailsLoading(false);
    }
  };

  const handleEdit = (mailTemplate: MailTemplate) => {
    router.push(routes.employee.editTemplate(mailTemplate.id));
  };

  const openCreateModal = () => {
    router.push(routes.employee.newTemplate);
  };

  const handleTest = (mailTemplate: MailTemplate) => {
    router.push(routes.employee.testTemplate(mailTemplate.id));
  };

  const handleEditMail = (mail: Mail) => {
    router.push(routes.employee.editMail(mail.id));
  };

  const openCreateMailModal = () => {
    router.push(routes.employee.newMail);
  };

  const handleViewMail = (mail: Mail) => {
    setMailToView(mail);
    setViewMailModalOpened(true);
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

  const filteredMails = mails.filter((mail) => {
    const matchesName =
      !mailNameFilter ||
      normalizeString(mail.name).includes(normalizeString(mailNameFilter));
    const matchesReceiver =
      !receiverFilter ||
      normalizeString(mail.receiver).includes(normalizeString(receiverFilter));
    return matchesName && matchesReceiver;
  });

  const sortedMails = [...filteredMails].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalMailRecords = sortedMails.length;
  const paginatedMails = sortedMails.slice(
    (mailPage - 1) * pageSize,
    mailPage * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  useEffect(() => {
    setMailPage(1);
  }, [mailNameFilter, receiverFilter]);

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Courriers</Title>

      <Tabs defaultValue="mails">
        <Tabs.List>
          <Tabs.Tab value="mails" leftSection={<IconMail size={16} />}>
            Courriers envoyés
          </Tabs.Tab>
          <Tabs.Tab value="templates" leftSection={<IconTemplate size={16} />}>
            Templates
          </Tabs.Tab>

        </Tabs.List>

        <Tabs.Panel value="templates" pt="xl">
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
              onTest={handleTest}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="mails" pt="xl">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2}>Mes courriers envoyés</Title>
              <Button leftSection={<IconPlus size={16} />} onClick={openCreateMailModal}>
                Créer un courrier
              </Button>
            </Group>

            <ActiveFilters
              filters={[
                {
                  label: 'Nom',
                  value: mailNameFilter,
                  onRemove: () => setMailNameFilter(''),
                },
                {
                  label: 'Destinataire',
                  value: receiverFilter,
                  onRemove: () => setReceiverFilter(''),
                },
              ]}
            />

            <MailsTable
              mails={paginatedMails}
              loading={mailsLoading}
              nameFilter={mailNameFilter}
              receiverFilter={receiverFilter}
              page={mailPage}
              pageSize={pageSize}
              totalRecords={totalMailRecords}
              onNameFilterChange={(value) => setMailNameFilter(value)}
              onReceiverFilterChange={(value) => setReceiverFilter(value)}
              onPageChange={(p) => setMailPage(p)}
              onEdit={handleEditMail}
              onDelete={(mail) => {
                setMailToDelete(mail);
                setDeleteMailModalOpened(true);
              }}
              onView={handleViewMail}
            />
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <DeleteUserMailTemplateModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setMailTemplateToDelete(null);
        }}
        mailTemplateToDelete={mailTemplateToDelete}
        onSuccess={loadMailTemplates}
      />

      <DeleteMailModal
        opened={deleteMailModalOpened}
        onClose={() => {
          setDeleteMailModalOpened(false);
          setMailToDelete(null);
        }}
        mailToDelete={mailToDelete}
        onSuccess={loadMails}
      />

      <ViewMailModal
        opened={viewMailModalOpened}
        onClose={() => {
          setViewMailModalOpened(false);
          setMailToView(null);
        }}
        mail={mailToView}
      />
    </Container>
  );
}

'use client';

import { useTenantRoutes } from '@/app/_contexts/PermissionsContext';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Container, Title, Group, Button, Stack, Tabs } from '@mantine/core';
import { IconPlus, IconTemplate, IconMail } from '@tabler/icons-react';
import { DeleteMailTemplateModal } from './components/DeleteMailTemplateModal';
import { DeleteMailModal } from './components/DeleteMailModal';
import { ViewMailModal } from './components/ViewMailModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { MailTemplatesTable } from '@/app/_components/mails/MailTemplatesTable';
import { MailsTable } from './components/MailsTable';
import type { MailListItem, MailTemplateListItem, MailsPageResult, MailTemplatesPageResult } from '@/types/mails';
import {
  defaultMailsPageFilters,
  defaultMailTemplatesPageFilters,
  useMailsPage,
  useUserMailTemplatesPage,
} from './hooks/useMailsQueries';

interface MailsPageClientProps {
  initialTab: 'mails' | 'templates';
  initialMailsPage?: MailsPageResult;
  initialMailTemplatesPage?: MailTemplatesPageResult;
}

export default function MailsPageClient({
  initialTab,
  initialMailsPage,
  initialMailTemplatesPage,
}: MailsPageClientProps) {
  const routes = useTenantRoutes();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const validTabs = ['mails', 'templates'] as const;
  const tabFromUrl = searchParams.get('tab');
  const resolvedTab =
    tabFromUrl && validTabs.includes(tabFromUrl as (typeof validTabs)[number])
      ? (tabFromUrl as (typeof validTabs)[number])
      : initialTab;
  const [activeTab, setActiveTab] = useState<(typeof validTabs)[number]>(resolvedTab);

  const [mailsFilters, setMailsFilters] = useState(defaultMailsPageFilters);
  const [templatesFilters, setTemplatesFilters] = useState(
    defaultMailTemplatesPageFilters,
  );

  const [deleteTemplateModalOpened, setDeleteTemplateModalOpened] = useState(false);
  const [mailTemplateToDelete, setMailTemplateToDelete] =
    useState<MailTemplateListItem | null>(null);
  const [deleteMailModalOpened, setDeleteMailModalOpened] = useState(false);
  const [mailToDelete, setMailToDelete] = useState<MailListItem | null>(null);
  const [viewMailModalOpened, setViewMailModalOpened] = useState(false);
  const [mailToViewId, setMailToViewId] = useState<string | null>(null);

  const mailsQuery = useMailsPage(mailsFilters, {
    initialData: initialMailsPage,
    enabled: activeTab === 'mails',
  });

  const templatesQuery = useUserMailTemplatesPage(templatesFilters, {
    initialData: initialMailTemplatesPage,
    enabled: activeTab === 'templates',
  });

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && validTabs.includes(tab as (typeof validTabs)[number])) {
      setActiveTab(tab as (typeof validTabs)[number]);
    }
  }, [searchParams]);

  const handleTabChange = (value: string | null) => {
    if (!value || !validTabs.includes(value as (typeof validTabs)[number])) return;
    setActiveTab(value as (typeof validTabs)[number]);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleMailsNameFilterChange = (value: string) => {
    setMailsFilters((prev) => ({ ...prev, nameSearch: value, page: 1 }));
  };

  const handleMailsReceiverFilterChange = (value: string) => {
    setMailsFilters((prev) => ({ ...prev, receiverSearch: value, page: 1 }));
  };

  const handleTemplatesNameFilterChange = (value: string) => {
    setTemplatesFilters((prev) => ({ ...prev, nameSearch: value, page: 1 }));
  };

  const mailsPage = mailsQuery.data;
  const templatesPage = templatesQuery.data;

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">Courriers</Title>

      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Tab value="mails" leftSection={<IconMail size={16} />}>
            Courriers envoyés
          </Tabs.Tab>
          <Tabs.Tab value="templates" leftSection={<IconTemplate size={16} />}>
            Modèles
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="templates" pt="xl">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2}>Gestion de mes modèles</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => router.push(routes.employee.newTemplate)}
              >
                Créer un modèle
              </Button>
            </Group>

            <ActiveFilters
              filters={[
                {
                  label: 'Nom',
                  value: templatesFilters.nameSearch,
                  onRemove: () => handleTemplatesNameFilterChange(''),
                },
              ]}
            />

            <MailTemplatesTable
              mailTemplates={templatesPage?.items ?? []}
              loading={templatesQuery.isFetching}
              nameFilter={templatesFilters.nameSearch}
              page={templatesFilters.page}
              pageSize={templatesFilters.pageSize}
              totalRecords={templatesPage?.totalCount ?? 0}
              onNameFilterChange={handleTemplatesNameFilterChange}
              onPageChange={(page) =>
                setTemplatesFilters((prev) => ({ ...prev, page }))
              }
              onEdit={(mailTemplate) =>
                router.push(routes.employee.editTemplate(mailTemplate.id))
              }
              onDelete={(mailTemplate) => {
                setMailTemplateToDelete(mailTemplate);
                setDeleteTemplateModalOpened(true);
              }}
              onTest={(mailTemplate) =>
                router.push(routes.employee.testTemplate(mailTemplate.id))
              }
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="mails" pt="xl">
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2}>Mes courriers envoyés</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => router.push(routes.employee.newMail)}
              >
                Créer un courrier
              </Button>
            </Group>

            <ActiveFilters
              filters={[
                {
                  label: 'Nom',
                  value: mailsFilters.nameSearch,
                  onRemove: () => handleMailsNameFilterChange(''),
                },
                {
                  label: 'Destinataire',
                  value: mailsFilters.receiverSearch,
                  onRemove: () => handleMailsReceiverFilterChange(''),
                },
              ]}
            />

            <MailsTable
              mails={mailsPage?.items ?? []}
              loading={mailsQuery.isFetching}
              nameFilter={mailsFilters.nameSearch}
              receiverFilter={mailsFilters.receiverSearch}
              page={mailsFilters.page}
              pageSize={mailsFilters.pageSize}
              totalRecords={mailsPage?.totalCount ?? 0}
              onNameFilterChange={handleMailsNameFilterChange}
              onReceiverFilterChange={handleMailsReceiverFilterChange}
              onPageChange={(page) =>
                setMailsFilters((prev) => ({ ...prev, page }))
              }
              onEdit={(mail) => router.push(routes.employee.editMail(mail.id))}
              onDelete={(mail) => {
                setMailToDelete(mail);
                setDeleteMailModalOpened(true);
              }}
              onView={(mail) => {
                setMailToViewId(mail.id);
                setViewMailModalOpened(true);
              }}
            />
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <DeleteMailTemplateModal
        opened={deleteTemplateModalOpened}
        onClose={() => {
          setDeleteTemplateModalOpened(false);
          setMailTemplateToDelete(null);
        }}
        mailTemplateToDelete={mailTemplateToDelete}
      />

      <DeleteMailModal
        opened={deleteMailModalOpened}
        onClose={() => {
          setDeleteMailModalOpened(false);
          setMailToDelete(null);
        }}
        mailToDelete={mailToDelete}
      />

      <ViewMailModal
        opened={viewMailModalOpened}
        onClose={() => {
          setViewMailModalOpened(false);
          setMailToViewId(null);
        }}
        mailId={mailToViewId}
      />
    </Container>
  );
}

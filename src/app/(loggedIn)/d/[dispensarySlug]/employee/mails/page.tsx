import { getMailsPage } from '@/app/_actions/mails';
import { getUserMailTemplatesPage } from '@/app/_actions/mailTemplates';
import MailsPageClient from './MailsPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';
import {
  defaultMailsPageFilters,
  defaultMailTemplatesPageFilters,
} from './hooks/useMailsQueries';

async function MailsContent({
  dispensarySlug,
  initialTab,
}: {
  dispensarySlug: string;
  initialTab: 'mails' | 'templates';
}) {
  const [mailsResult, templatesResult] = await Promise.all([
    initialTab === 'mails'
      ? getMailsPage(dispensarySlug, {
          page: defaultMailsPageFilters.page,
          pageSize: defaultMailsPageFilters.pageSize,
        })
      : Promise.resolve(null),
    initialTab === 'templates'
      ? getUserMailTemplatesPage(dispensarySlug, {
          page: defaultMailTemplatesPageFilters.page,
          pageSize: defaultMailTemplatesPageFilters.pageSize,
        })
      : Promise.resolve(null),
  ]);

  const initialMailsPage =
    mailsResult !== null
      ? getDataOrThrow(mailsResult, 'Erreur lors du chargement des courriers')
      : undefined;

  const initialMailTemplatesPage =
    templatesResult !== null
      ? getDataOrThrow(
          templatesResult,
          'Erreur lors du chargement des modèles de courriers',
        )
      : undefined;

  return (
    <MailsPageClient
      initialTab={initialTab}
      initialMailsPage={initialMailsPage}
      initialMailTemplatesPage={initialMailTemplatesPage}
    />
  );
}

export default async function MailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ dispensarySlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { dispensarySlug } = await params;
  const { tab } = await searchParams;
  const initialTab = tab === 'templates' ? 'templates' : 'mails';

  return (
    <SuspenseLoader>
      <MailsContent dispensarySlug={dispensarySlug} initialTab={initialTab} />
    </SuspenseLoader>
  );
}

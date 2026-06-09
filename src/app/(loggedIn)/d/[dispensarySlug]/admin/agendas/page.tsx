import { listAgendasForAdmin } from '@/app/_actions/agenda/agendas';
import { AgendasAdminPageClient } from './AgendasAdminPageClient';

export default async function AgendasAdminPage({
  params,
}: {
  params: Promise<{ dispensarySlug: string }>;
}) {
  const { dispensarySlug } = await params;
  const result = await listAgendasForAdmin(dispensarySlug);

  return (
    <AgendasAdminPageClient
      dispensarySlug={dispensarySlug}
      initialAgendas={result.status === 200 && 'data' in result ? result.data ?? [] : []}
      error={result.status !== 200 && 'error' in result ? String(result.error) : undefined}
    />
  );
}

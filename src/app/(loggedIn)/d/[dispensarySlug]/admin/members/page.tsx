import { listDispensaryMembers } from '@/app/_actions/dispensaryMembers';
import { DispensaryMembersClient } from './DispensaryMembersClient';

export default async function DispensaryMembersPage({
  params,
}: {
  params: Promise<{ dispensarySlug: string }>;
}) {
  const { dispensarySlug } = await params;
  const result = await listDispensaryMembers(dispensarySlug);

  return (
    <DispensaryMembersClient
      dispensarySlug={dispensarySlug}
      initialMembers={result.status === 200 ? result.data ?? [] : []}
      error={result.status !== 200 ? result.error : undefined}
    />
  );
}

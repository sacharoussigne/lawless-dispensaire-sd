import { listUsers } from '@/app/_actions/users';
import UsersPageClient from './UsersPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import { getDataOrThrow } from '@/lib/response';
import type { User } from '@/types/users';

async function UsersContent() {
  const result = await listUsers({
    limit: 10,
    offset: 0,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });

  // Lance une erreur si la réponse est une erreur (sera capturée par error.tsx)
  const data = getDataOrThrow(result, 'Erreur lors du chargement des utilisateurs');

  const users: User[] = (data.users || []).map((user: any) => ({
    ...user,
    role: user.role ?? null,
  }));

  return (
    <UsersPageClient
      initialUsers={users}
      initialTotalRecords={data.total || 0}
    />
  );
}

export default function UsersPage() {
  return (
    <SuspenseLoader>
      <UsersContent />
    </SuspenseLoader>
  );
}

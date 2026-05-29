export const dynamic = 'force-dynamic';

import { listUsers } from '@/app/_actions/users';
import UsersPageClient from '@/app/(loggedIn)/(admin)/admin/users/UsersPageClient';
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

  const data = getDataOrThrow(result, 'Erreur lors du chargement des utilisateurs');

  const users: User[] = (data.users || []).map((user) => ({
    ...(user as User),
    role: (user as { role?: string | null }).role ?? null,
  }));

  return (
    <UsersPageClient
      initialUsers={users}
      initialTotalRecords={data.total || 0}
    />
  );
}

export default function PlatformUsersPage() {
  return (
    <SuspenseLoader>
      <UsersContent />
    </SuspenseLoader>
  );
}

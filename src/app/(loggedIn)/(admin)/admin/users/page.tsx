import { listUsers } from '@/app/_actions/users';
import UsersPageClient from './UsersPageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';
import type { User } from '@/types/users';

async function UsersContent() {
  const result = await listUsers({
    limit: 10,
    offset: 0,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });

  const users: User[] =
    result.status === 200 && 'data' in result && result.data?.users
      ? result.data.users.map((user: any) => ({
          ...user,
          role: user.role ?? null,
        }))
      : [];

  const totalRecords =
    result.status === 200 && 'data' in result && result.data?.total
      ? result.data.total
      : 0;

  return (
    <UsersPageClient
      initialUsers={users}
      initialTotalRecords={totalRecords}
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

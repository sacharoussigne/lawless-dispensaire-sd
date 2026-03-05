'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { listUsers, impersonateUser } from '@/app/_actions/users';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { UserModal } from './components/UserModal';
import { DeleteUserModal } from './components/DeleteUserModal';
import { PasswordModal } from './components/PasswordModal';
import { UsersTable } from './components/UsersTable';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { authClient } from '@/lib/client';
import { useRouter } from 'next/navigation';
import type { User } from '@/types/users';

interface UsersPageClientProps {
  initialUsers: User[];
  initialTotalRecords: number;
}

export default function UsersPageClient({
  initialUsers,
  initialTotalRecords,
}: UsersPageClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [totalRecords, setTotalRecords] = useState(initialTotalRecords);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [passwordModalOpened, setPasswordModalOpened] = useState(false);
  const [userForPassword, setUserForPassword] = useState<User | null>(null);

  const [emailFilter, setEmailFilter] = useState<string>('');
  const [nameFilter, setNameFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    // Récupérer l'ID de l'utilisateur actuel
    authClient.getSession().then((session) => {
      if (session?.data?.user?.id) {
        setCurrentUserId(session.data.user.id);
      }
    });
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await listUsers({
        searchValue: emailFilter || nameFilter || undefined,
        searchField: emailFilter ? 'email' : 'name',
        limit: pageSize,
        offset: (page - 1) * pageSize,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });
      const data = handleAction(result);
      if (data) {
        const mappedUsers = (data.users || []).map((user: any) => ({
          ...user,
          role: user.role ?? null,
        }));
        setUsers(mappedUsers);
        setTotalRecords(data.total || 0);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des utilisateurs',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, emailFilter, nameFilter]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setModalOpened(true);
  };

  const openPasswordModal = (user: User) => {
    setUserForPassword(user);
    setPasswordModalOpened(true);
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const result = await impersonateUser(userId);
      const data = handleAction(result);
      
      if (!data) {
        throw new Error('Erreur lors de l\'impersonation');
      }

      notifications.show({
        title: 'Succès',
        message: 'Connexion en tant qu\'utilisateur réussie',
        color: 'green',
      });
      
      // Recharger la page pour mettre à jour la session
      router.refresh();
      window.location.href = '/';
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'impersonation',
        color: 'red',
      });
    }
  };

  // Filtrer les utilisateurs côté client pour le filtre de rôle
  const filteredUsers = users.filter((user) => {
    const matchesRole =
      !roleFilter || (user.role && user.role.split(',').map((r: string) => r.trim()).includes(roleFilter));
    return matchesRole;
  });

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Utilisateurs</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer un utilisateur
        </Button>
      </Group>

      <ActiveFilters
        filters={[
          {
            label: 'Nom',
            value: nameFilter,
            onRemove: () => setNameFilter(''),
          },
          {
            label: 'Email',
            value: emailFilter,
            onRemove: () => setEmailFilter(''),
          },
          {
            label: 'Rôle',
            value: roleFilter,
            onRemove: () => setRoleFilter(null),
          },
        ]}
      />

      <UsersTable
        users={filteredUsers}
        loading={loading}
        currentUserId={currentUserId}
        nameFilter={nameFilter}
        emailFilter={emailFilter}
        roleFilter={roleFilter}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onNameFilterChange={(value) => {
          setNameFilter(value);
          setPage(1);
        }}
        onEmailFilterChange={(value) => {
          setEmailFilter(value);
          setPage(1);
        }}
        onRoleFilterChange={(value) => setRoleFilter(value)}
        onPageChange={(p) => setPage(p)}
        onEdit={handleEdit}
        onDelete={(user) => {
          setUserToDelete(user);
          setDeleteModalOpened(true);
        }}
        onPasswordChange={openPasswordModal}
        onImpersonate={handleImpersonate}
      />

      <UserModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingUser(null);
        }}
        editingUser={editingUser}
        onSuccess={loadUsers}
      />

      <PasswordModal
        opened={passwordModalOpened}
        onClose={() => {
          setPasswordModalOpened(false);
          setUserForPassword(null);
        }}
        userForPassword={userForPassword}
        onSuccess={() => {
          setPasswordModalOpened(false);
          setUserForPassword(null);
        }}
      />

      <DeleteUserModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setUserToDelete(null);
        }}
        userToDelete={userToDelete}
        onSuccess={loadUsers}
      />
    </Container>
  );
}


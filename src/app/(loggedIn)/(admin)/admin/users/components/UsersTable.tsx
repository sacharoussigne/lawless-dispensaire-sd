'use client';

import { Paper, TextInput, Select, Group, ActionIcon, Badge, Text, Menu } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconEdit, IconTrash, IconKey, IconUser, IconDots } from '@tabler/icons-react';
import { Role, rolesAsString } from '@/types/enum/roles';
import type { User } from '@/types/users';
import { hasRole } from '@/lib/auth/permissions';

interface UsersTableProps {
  users: User[];
  loading: boolean;
  currentUserId: string | null;
  nameFilter: string;
  emailFilter: string;
  roleFilter: string | null;
  page: number;
  pageSize: number;
  totalRecords: number;
  onNameFilterChange: (value: string) => void;
  onEmailFilterChange: (value: string) => void;
  onRoleFilterChange: (value: string | null) => void;
  onPageChange: (page: number) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onPasswordChange: (user: User) => void;
  onImpersonate: (userId: string) => void;
}

const roleOptions = [
  { value: '', label: 'Tous les rôles' },
  { value: 'user', label: rolesAsString(Role.USER) },
  { value: 'admin', label: rolesAsString(Role.ADMIN) },
  { value: 'employee', label: rolesAsString(Role.EMPLOYEE) },
  { value: 'inventory_manager', label: rolesAsString(Role.INVENTORY_MANAGER) },
];

export function UsersTable({
  users,
  loading,
  currentUserId,
  nameFilter,
  emailFilter,
  roleFilter,
  page,
  pageSize,
  totalRecords,
  onNameFilterChange,
  onEmailFilterChange,
  onRoleFilterChange,
  onPageChange,
  onEdit,
  onDelete,
  onPasswordChange,
  onImpersonate,
}: UsersTableProps) {

  return (
    <Paper shadow="sm" p="md" withBorder>
      <DataTable
        records={users}
        columns={[
          {
            accessor: 'name',
            title: 'Nom',
            render: (user: User) => (
              <Group gap="xs" wrap="nowrap">
                <Text>{user.name}</Text>
                {currentUserId === user.id && (
                  <Badge color="blue" variant="light" size="sm">
                    Vous
                  </Badge>
                )}
              </Group>
            ),
            filter: (
              <TextInput
                placeholder="Rechercher un nom..."
                value={nameFilter}
                onChange={(e) => onNameFilterChange(e.currentTarget.value)}
                style={{ minWidth: 200 }}
              />
            ),
          },
          {
            accessor: 'email',
            title: 'Email',
            filter: (
              <TextInput
                placeholder="Rechercher un email..."
                value={emailFilter}
                onChange={(e) => onEmailFilterChange(e.currentTarget.value)}
                style={{ minWidth: 200 }}
              />
            ),
          },
          {
            accessor: 'role',
            title: 'Rôles',
            render: (user: User) => {
              const rawRoles = (user.role ?? '')
                .split(',')
                .map((r) => r.trim())
                .filter((r) => !!r)
                .sort((a, b) => a.localeCompare(b)) as string[];

              if (rawRoles.length === 0) {
                return <Badge color="gray">Aucun</Badge>;
              }

              return (
                <Group gap="xs" wrap="wrap">
                  {rawRoles.map((r) => {
                    let color: string = 'gray';
                    let label: string = r;

                    switch (r) {
                      case Role.USER:
                        color = 'gray';
                        label = rolesAsString(Role.USER);
                        break;
                      case Role.ADMIN:
                        color = 'red';
                        label = rolesAsString(Role.ADMIN);
                        break;
                      case Role.EMPLOYEE:
                        color = 'green';
                        label = rolesAsString(Role.EMPLOYEE);
                        break;
                      case Role.INVENTORY_MANAGER:
                        color = 'blue';
                        label = rolesAsString(Role.INVENTORY_MANAGER);
                        break;
                      default:
                        color = 'gray';
                        label = r;
                        break;
                    }

                    return (
                      <Badge key={r} color={color}>
                        {label}
                      </Badge>
                    );
                  })}
                </Group>
              );
            },
            filter: (
              <Select
                placeholder="Tous les rôles"
                data={roleOptions}
                value={roleFilter || ''}
                onChange={(value) => onRoleFilterChange(value || null)}
                clearable
                style={{ minWidth: 200 }}
              />
            ),
          },
          {
            accessor: 'banned',
            title: 'Statut',
            render: (user: User) => (
              <Badge color={user.banned ? 'red' : 'green'}>
                {user.banned ? 'Banni' : 'Actif'}
              </Badge>
            ),
          },
          {
            accessor: 'createdAt',
            title: 'Date de création',
            render: (user: User) =>
              new Date(user.createdAt).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
          },
          {
            accessor: 'actions',
            title: 'Actions',
            render: (user: User) => (
              <Group gap="xs" wrap="nowrap" justify="flex-end">
                <Menu shadow="md" width={200}>
                  <Menu.Target>
                    <ActionIcon variant="light" color="gray">
                      <IconDots size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconEdit size={16} />}
                      onClick={() => onEdit(user)}
                    >
                      Modifier
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconKey size={16} />}
                      onClick={() => onPasswordChange(user)}
                    >
                      Changer le mot de passe
                    </Menu.Item>
                    {currentUserId !== user.id && (
                      <>
                        <Menu.Item
                          leftSection={<IconUser size={16} />}
                          onClick={() => onImpersonate(user.id)}
                        >
                          Se connecter en tant que
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          leftSection={<IconTrash size={16} />}
                          color="red"
                          onClick={() => onDelete(user)}
                        >
                          Supprimer
                        </Menu.Item>
                      </>
                    )}
                  </Menu.Dropdown>
                </Menu>
              </Group>
            ),
          },
        ]}
        totalRecords={totalRecords}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={onPageChange}
        fetching={loading}
        noRecordsText="Aucun utilisateur trouvé"
      />
    </Paper>
  );
}


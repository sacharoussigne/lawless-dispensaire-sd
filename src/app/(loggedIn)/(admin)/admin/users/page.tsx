'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Paper,
  TextInput,
  Button,
  ActionIcon,
  Group,
  Modal,
  Stack,
  Select,
  Badge,
  Text,
  PasswordInput,
  Menu,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconPlus, IconKey, IconUser, IconDots } from '@tabler/icons-react';
import { listUsers, createUser, updateUser, deleteUser, setPassword, impersonateUser } from '@/app/_actions/users';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { Role, rolesAsString } from '@/types/enum/roles';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/client';

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null | undefined;
  emailVerified: boolean;
  banned: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

function UsersPageContent() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [totalRecords, setTotalRecords] = useState(0);

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      password: '',
      role: 'user' as Role,
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      email: (value) => {
        // Email requis seulement à la création
        if (!editingUser && !value) return 'L\'email est requis';
        if (!editingUser && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email invalide';
        return null;
      },
      password: (value, values) => {
        if (!editingUser && !value) return 'Le mot de passe est requis';
        if (value && value.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
        return null;
      },
    },
  });

  const passwordForm = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: (value) => (value.length < 8 ? 'Le mot de passe doit contenir au moins 8 caractères' : null),
      confirmPassword: (value, values) => (value !== values.password ? 'Les mots de passe ne correspondent pas' : null),
    },
  });

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
        // Mapper les utilisateurs pour convertir undefined en null pour role
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
    // Récupérer l'ID de l'utilisateur actuel
    authClient.getSession().then((session) => {
      if (session?.data?.user?.id) {
        setCurrentUserId(session.data.user.id);
      }
    });
  }, [page, emailFilter, nameFilter]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editingUser) {
        const result = await updateUser({
          id: editingUser.id,
          name: values.name,
          role: values.role,
        });
        handleAction(result);
        notifications.show({
          title: 'Succès',
          message: 'Utilisateur modifié avec succès',
          color: 'green',
        });
      } else {
        const result = await createUser({
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
        });
        handleAction(result);
        notifications.show({
          title: 'Succès',
          message: 'Utilisateur créé avec succès',
          color: 'green',
        });
      }
      setModalOpened(false);
      form.reset();
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      } else {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors de la sauvegarde',
          color: 'red',
        });
      }
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      const result = await deleteUser({ id: userToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Utilisateur supprimé avec succès',
        color: 'green',
      });
      setDeleteModalOpened(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  const handlePasswordChange = async (values: typeof passwordForm.values) => {
    if (!userForPassword) return;

    try {
      const result = await setPassword({
        userId: userForPassword.id,
        password: values.password,
      });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Mot de passe modifié avec succès',
        color: 'green',
      });
      setPasswordModalOpened(false);
      passwordForm.reset();
      setUserForPassword(null);
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, passwordForm);
      } else {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors du changement de mot de passe',
          color: 'red',
        });
      }
    }
  };

  const handleImpersonate = async (userId: string) => {
    try {
      const result = await impersonateUser(userId);
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Connexion en tant qu\'utilisateur réussie',
        color: 'green',
      });
      // Recharger la page pour que la session soit mise à jour
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

  const openCreateModal = () => {
    setEditingUser(null);
    form.reset();
    form.setFieldValue('role', Role.USER);
    setModalOpened(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    form.setValues({
      name: user.name,
      email: user.email,
      password: '',
      role: (user.role as Role) || 'user',
    });
    setModalOpened(true);
  };

  const openPasswordModal = (user: User) => {
    setUserForPassword(user);
    passwordForm.reset();
    setPasswordModalOpened(true);
  };

  // Filtrer les utilisateurs
  const filteredUsers = users.filter((user) => {
    const matchesEmail = !emailFilter || user.email.toLowerCase().includes(emailFilter.toLowerCase());
    const matchesName = !nameFilter || user.name.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesEmail && matchesName && matchesRole;
  });

  const roleOptions = [
    { value: '', label: 'Tous les rôles' },
    { value: 'user', label: rolesAsString(Role.USER) },
    { value: 'admin', label: rolesAsString(Role.ADMIN) },
    { value: 'employee', label: rolesAsString(Role.EMPLOYEE) },
    { value: 'inventory_manager', label: rolesAsString(Role.INVENTORY_MANAGER) },
  ];

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Utilisateurs</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer un utilisateur
        </Button>
      </Group>

      <Paper shadow="sm" p="md" withBorder>
        <DataTable
          records={filteredUsers}
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
                  onChange={(e) => setNameFilter(e.currentTarget.value)}
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
                  onChange={(e) => setEmailFilter(e.currentTarget.value)}
                  style={{ minWidth: 200 }}
                />
              ),
            },
            {
              accessor: 'role',
              title: 'Rôle',
              render: (user: User) => (
                <Badge color={user.role === 'admin' ? 'red' : user.role === 'inventory_manager' ? 'blue' : user.role === 'employee' ? 'green' : 'gray'}>
                  {user.role ? rolesAsString(user.role as Role) : 'Aucun'}
                </Badge>
              ),
              filter: (
                <Select
                  placeholder="Tous les rôles"
                  data={roleOptions}
                  value={roleFilter || ''}
                  onChange={(value) => setRoleFilter(value || null)}
                  clearable
                  style={{ minWidth: 200 }}
                />
              ),
            },
            {
              accessor: 'emailVerified',
              title: 'Email vérifié',
              render: (user: User) => (
                <Badge color={user.emailVerified ? 'green' : 'red'}>
                  {user.emailVerified ? 'Oui' : 'Non'}
                </Badge>
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
                        onClick={() => openEditModal(user)}
                      >
                        Modifier
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconKey size={16} />}
                        onClick={() => openPasswordModal(user)}
                      >
                        Changer le mot de passe
                      </Menu.Item>
                      {currentUserId !== user.id && (
                        <>
                          <Menu.Item
                            leftSection={<IconUser size={16} />}
                            onClick={() => handleImpersonate(user.id)}
                          >
                            Se connecter en tant que
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            leftSection={<IconTrash size={16} />}
                            color="red"
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteModalOpened(true);
                            }}
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
          onPageChange={setPage}
          fetching={loading}
          noRecordsText="Aucun utilisateur trouvé"
        />
      </Paper>

      {/* Modal de création/édition */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          form.reset();
          setEditingUser(null);
        }}
        title={editingUser ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Nom"
              placeholder="Nom de l'utilisateur"
              required
              {...form.getInputProps('name')}
            />
            {!editingUser ? (
              <TextInput
                label="Email"
                placeholder="email@example.com"
                required
                {...form.getInputProps('email')}
              />
            ) : (
              <TextInput
                label="Email"
                value={editingUser.email}
                disabled
                readOnly
              />
            )}
            {!editingUser && (
              <PasswordInput
                label="Mot de passe"
                placeholder="Mot de passe (min. 8 caractères)"
                required
                {...form.getInputProps('password')}
              />
            )}
            <Select
              label="Rôle"
              data={roleOptions.filter((opt) => opt.value !== '')}
              required
              {...form.getInputProps('role')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setModalOpened(false);
                  form.reset();
                  setEditingUser(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingUser ? 'Enregistrer' : 'Créer'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal de changement de mot de passe */}
      <Modal
        opened={passwordModalOpened}
        onClose={() => {
          setPasswordModalOpened(false);
          passwordForm.reset();
          setUserForPassword(null);
        }}
        title="Changer le mot de passe"
      >
        <form onSubmit={passwordForm.onSubmit(handlePasswordChange)}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Utilisateur : {userForPassword?.name} ({userForPassword?.email})
            </Text>
            <PasswordInput
              label="Nouveau mot de passe"
              placeholder="Mot de passe (min. 8 caractères)"
              required
              {...passwordForm.getInputProps('password')}
            />
            <PasswordInput
              label="Confirmer le mot de passe"
              placeholder="Confirmer le mot de passe"
              required
              {...passwordForm.getInputProps('confirmPassword')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setPasswordModalOpened(false);
                  passwordForm.reset();
                  setUserForPassword(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                Changer le mot de passe
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal de suppression */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setUserToDelete(null);
        }}
        title="Supprimer l'utilisateur"
      >
        <Stack gap="md">
          <Text>
            Êtes-vous sûr de vouloir supprimer l'utilisateur{' '}
            <strong>{userToDelete?.name}</strong> ({userToDelete?.email}) ?
          </Text>
          <Text size="sm" c="red">
            Cette action est irréversible.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpened(false);
                setUserToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button color="red" onClick={handleDelete}>
              Supprimer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

export default function UsersPage() {
  return <UsersPageContent />;
}


'use client';

import { useEffect, useState } from 'react';
import {
  Modal,
  Stack,
  Select,
  Button,
  Group,
  Text,
  Badge,
  ActionIcon,
  Table,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  createBankAccountAccess,
  deleteBankAccountAccess,
} from '@/app/_actions/bankAccounts';
import { listUsers } from '@/app/_actions/users';
import { handleAction } from '@/lib/action';
import type { BankAccountWithRelations } from '@/types/bankAccounts';
import type { User } from '@/types/users';

interface ManageAccessModalProps {
  opened: boolean;
  onClose: () => void;
  account: BankAccountWithRelations | null;
  onSuccess: () => void;
}

export function ManageAccessModal({
  opened,
  onClose,
  account,
  onSuccess,
}: ManageAccessModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [accessType, setAccessType] = useState<'READ' | 'WRITE'>('READ');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opened && account) {
      loadUsers();
    }
  }, [opened, account]);

  const loadUsers = async () => {
    try {
      const result = await listUsers();
      const data = handleAction(result);
      if (data) {
        // Filtrer les utilisateurs qui n'ont pas déjà accès et qui ne sont pas le propriétaire
        const filteredUsers = data.users.filter(
          (user: User) =>
            user.id !== account?.ownerId &&
            !account?.accesses.some((access) => access.userId === user.id)
        );
        setUsers(filteredUsers);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des utilisateurs',
        color: 'red',
      });
    }
  };

  const handleAddAccess = async () => {
    if (!account || !selectedUserId) return;

    try {
      setLoading(true);
      const result = await createBankAccountAccess({
        accountId: account.id,
        userId: selectedUserId,
        accessType,
      });

      const data = handleAction(result);
      if (data) {
        notifications.show({
          title: 'Succès',
          message: 'Accès ajouté avec succès',
          color: 'green',
        });
        setSelectedUserId(null);
        setAccessType('READ');
        onSuccess();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'ajout de l\'accès',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccess = async (accessId: string) => {
    if (!account) return;

    try {
      setLoading(true);
      const result = await deleteBankAccountAccess({
        id: accessId,
      });

      const data = handleAction(result);
      if (data) {
        notifications.show({
          title: 'Succès',
          message: 'Accès supprimé avec succès',
          color: 'green',
        });
        onSuccess();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression de l\'accès',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!account) return null;

  const userOptions = users.map((user) => ({
    value: user.id,
    label: `${user.name} (${user.email})`,
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Gérer les accès"
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Ajouter un accès pour un utilisateur
        </Text>

        <Group>
          <Select
            placeholder="Sélectionner un utilisateur"
            data={userOptions}
            value={selectedUserId}
            onChange={(value) => setSelectedUserId(value)}
            style={{ flex: 1 }}
            searchable
          />
          <Select
            placeholder="Type d'accès"
            data={[
              { value: 'READ', label: 'Lecture' },
              { value: 'WRITE', label: 'Écriture' },
            ]}
            value={accessType}
            onChange={(value) => setAccessType(value as 'READ' | 'WRITE')}
            style={{ width: 150 }}
          />
          <Button
            onClick={handleAddAccess}
            disabled={!selectedUserId || loading}
          >
            Ajouter
          </Button>
        </Group>

        {account.accesses.length > 0 && (
          <>
            <Text size="sm" fw={500} mt="md">
              Accès existants
            </Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Utilisateur</Table.Th>
                  <Table.Th>Type d'accès</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {account.accesses.map((access) => (
                  <Table.Tr key={access.id}>
                    <Table.Td>
                      {access.user.name} ({access.user.email})
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={access.accessType === 'WRITE' ? 'green' : 'blue'}
                      >
                        {access.accessType === 'WRITE' ? 'Écriture' : 'Lecture'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => handleDeleteAccess(access.id)}
                        disabled={loading}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </>
        )}

        {account.accesses.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="md">
            Aucun accès partagé
          </Text>
        )}
      </Stack>
    </Modal>
  );
}

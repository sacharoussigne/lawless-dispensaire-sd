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
  getBankAccount,
} from '@/app/_actions/bankAccounts';
import { listUsersForBankAccess } from '@/app/_actions/users';
import { handleAction } from '@/lib/action';
import type { BankAccountWithRelations } from '@/types/bankAccounts';

type BankAccessUser = {
  id: string;
  name: string;
};

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
  const [localAccount, setLocalAccount] = useState<BankAccountWithRelations | null>(account);
  const [users, setUsers] = useState<BankAccessUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [accessType, setAccessType] = useState<'READ' | 'WRITE'>('READ');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opened && account) {
      setLocalAccount(account);
      loadUsers(account);
    }
  }, [opened, account]);

  const reloadAccount = async () => {
    if (!localAccount) return;
    try {
      const result = await getBankAccount(localAccount.id);
      const data = handleAction(result);
      if (data) {
        setLocalAccount(data);
        loadUsers(data);
      }
    } catch (error) {
      // Ignore
    }
  };

  const loadUsers = async (accountToUse: BankAccountWithRelations) => {
    try {
      const result = await listUsersForBankAccess();
      const data = handleAction(result);
      if (data && accountToUse) {
        const filteredUsers = (data.users || []).filter(
          (user: BankAccessUser) =>
            user.id !== accountToUse.ownerId &&
            !accountToUse.accesses.some((access) => access.userId === user.id)
        );
        setUsers(filteredUsers as BankAccessUser[]);
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
    if (!localAccount || !selectedUserId) return;

    try {
      setLoading(true);
      const result = await createBankAccountAccess({
        accountId: localAccount.id,
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
        await reloadAccount();
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
    if (!localAccount) return;

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
        await reloadAccount();
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

  if (!localAccount) return null;

  const userOptions = users.map((user) => ({
    value: user.id,
    label: user.name,
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

        {localAccount.accesses.length > 0 && (
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
                {localAccount.accesses.map((access) => (
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

        {localAccount.accesses.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="md">
            Aucun accès partagé
          </Text>
        )}
      </Stack>
    </Modal>
  );
}

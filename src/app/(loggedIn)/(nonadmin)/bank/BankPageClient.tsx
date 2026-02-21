'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
  Paper,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { getBankAccounts } from '@/app/_actions/bankAccounts';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { DataTable } from 'mantine-datatable';
import { routes } from '@/types/routes';
import type { BankAccountWithRelations } from '@/types/bankAccounts';
import { CreateBankAccountModal } from './components/CreateBankAccountModal';
import { EditBankAccountModal } from './components/EditBankAccountModal';
import { DeleteBankAccountModal } from './components/DeleteBankAccountModal';
import { ManageAccessModal } from './components/ManageAccessModal';
import { authClient } from '@/lib/client';

interface BankPageClientProps {
  initialAccounts: BankAccountWithRelations[];
}

export default function BankPageClient({
  initialAccounts,
}: BankPageClientProps) {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<BankAccountWithRelations[]>(initialAccounts);
  const [loading, setLoading] = useState(false);
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [accessModalOpened, setAccessModalOpened] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccountWithRelations | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<BankAccountWithRelations | null>(null);
  const [accountForAccess, setAccountForAccess] = useState<BankAccountWithRelations | null>(null);

  useEffect(() => {
    authClient.getSession().then((session) => {
      if (session?.data?.user?.id) {
        setCurrentUserId(session.data.user.id);
      }
    });
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const result = await getBankAccounts();
      const data = handleAction(result);
      if (data) {
        setAccounts(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des comptes',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account: BankAccountWithRelations) => {
    setEditingAccount(account);
    setEditModalOpened(true);
  };

  const handleDelete = (account: BankAccountWithRelations) => {
    setAccountToDelete(account);
    setDeleteModalOpened(true);
  };

  const handleManageAccess = (account: BankAccountWithRelations) => {
    setAccountForAccess(account);
    setAccessModalOpened(true);
  };

  const handleView = (account: BankAccountWithRelations) => {
    router.push(`${routes.bank.index}/${account.id}`);
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Comptes bancaires</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateModalOpened(true)}
        >
          Créer un compte
        </Button>
      </Group>

      <Paper shadow="sm" withBorder>
        <DataTable
          records={accounts}
          columns={[
            {
              accessor: 'name',
              title: 'Nom',
              sortable: true,
            },
            {
              accessor: 'owner.name',
              title: 'Propriétaire',
              sortable: true,
            },
            {
              accessor: 'accesses',
              title: 'Accès partagés',
              render: (account: BankAccountWithRelations) => {
                if (account.accesses.length === 0) {
                  return '-';
                }
                return `${account.accesses.length} utilisateur${account.accesses.length > 1 ? 's' : ''}`;
              },
            },
            {
              accessor: 'createdAt',
              title: 'Date de création',
              render: (account: BankAccountWithRelations) =>
                new Date(account.createdAt).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
              sortable: true,
            },
            {
              accessor: 'actions',
              title: 'Actions',
              render: (account: BankAccountWithRelations) => {
                const isOwner = currentUserId === account.ownerId;
                return (
                  <Group gap="xs" wrap="nowrap" justify="flex-end">
                    <Button
                      variant="light"
                      size="xs"
                      onClick={() => handleView(account)}
                    >
                      Ouvrir
                    </Button>
                    {isOwner && (
                      <>
                        <Button
                          variant="light"
                          size="xs"
                          onClick={() => handleEdit(account)}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="light"
                          size="xs"
                          onClick={() => handleManageAccess(account)}
                        >
                          Accès
                        </Button>
                        <Button
                          variant="light"
                          color="red"
                          size="xs"
                          onClick={() => handleDelete(account)}
                        >
                          Supprimer
                        </Button>
                      </>
                    )}
                  </Group>
                );
              },
            },
          ]}
          fetching={loading}
          noRecordsText="Aucun compte bancaire trouvé"
        />
      </Paper>

      <CreateBankAccountModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        onSuccess={loadAccounts}
      />

      <EditBankAccountModal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setEditingAccount(null);
        }}
        editingAccount={editingAccount}
        onSuccess={loadAccounts}
      />

      <DeleteBankAccountModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setAccountToDelete(null);
        }}
        accountToDelete={accountToDelete}
        onSuccess={loadAccounts}
      />

      <ManageAccessModal
        opened={accessModalOpened}
        onClose={() => {
          setAccessModalOpened(false);
          setAccountForAccess(null);
        }}
        account={accountForAccess}
        onSuccess={loadAccounts}
      />
    </Container>
  );
}

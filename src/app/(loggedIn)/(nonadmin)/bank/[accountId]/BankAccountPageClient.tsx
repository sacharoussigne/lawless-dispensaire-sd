'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
  Paper,
  Table,
  NumberInput,
  Select,
  ActionIcon,
  Text,
  Badge,
  Stack,
  Autocomplete,
  Popover,
} from '@mantine/core';
import { DatePickerInput, DateInput, DatesProvider } from '@mantine/dates';
import 'dayjs/locale/fr';
import { 
  IconPlus, 
  IconTrash, 
  IconChevronLeft, 
  IconChevronRight,
  IconArrowDown,
  IconArrowUp,
  IconTransfer,
  IconEdit,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  getOrCreateWeek,
  getAccountWeeks,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getNameSuggestions,
  getDescriptionSuggestions,
  addNameSuggestion,
  addDescriptionSuggestion,
  deleteNameSuggestion,
  deleteDescriptionSuggestion,
} from '@/app/_actions/bankAccounts';
import { handleAction } from '@/lib/action';
import { format, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { BankAccountWithRelations } from '@/types/bankAccounts';
import type { BankAccountWeek, BankTransaction } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { routes } from '@/types/routes';

type SerializedBankAccountWeek = Omit<BankAccountWeek, 'balance'> & {
  balance: number;
  transactions: Array<Omit<BankTransaction, 'amount'> & { amount: number }>;
};

interface BankAccountPageClientProps {
  account: BankAccountWithRelations;
  initialWeek: SerializedBankAccountWeek;
}

const transactionTypeOptions = [
  { value: 'DEPOSIT', label: 'Dépôt', icon: IconArrowUp, color: 'green' },
  { value: 'WITHDRAWAL', label: 'Retrait', icon: IconArrowDown, color: 'red' },
  { value: 'TRANSFER_IN', label: 'Transfert entrant', icon: IconTransfer, color: 'blue' },
  { value: 'TRANSFER_OUT', label: 'Transfert sortant', icon: IconTransfer, color: 'orange' },
];

const getTransactionTypeInfo = (type: string) => {
  return transactionTypeOptions.find(opt => opt.value === type) || transactionTypeOptions[0];
};

export default function BankAccountPageClient({
  account,
  initialWeek,
}: BankAccountPageClientProps) {
  const router = useRouter();
  const [week, setWeek] = useState<SerializedBankAccountWeek>(initialWeek);
  const [weeks, setWeeks] = useState<SerializedBankAccountWeek[]>([]);
  const [loading, setLoading] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);
  const [weekDateValue, setWeekDateValue] = useState<Date | null>(new Date(initialWeek.weekStart));
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editingTransactionData, setEditingTransactionData] = useState<{
    date?: Date | string;
    type?: string;
    name?: string;
    description?: string;
    amount?: number;
    order?: number;
  } | null>(null);
  const [newTransaction, setNewTransaction] = useState<{
    date?: Date | string;
    type?: string;
    name?: string;
    description?: string;
    amount?: number;
    order?: number;
  } | null>(null);
  const [deletePopoverOpened, setDeletePopoverOpened] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadSuggestions();
    loadWeeks();
  }, []);

  const loadSuggestions = async () => {
    try {
      const [nameResult, descResult] = await Promise.all([
        getNameSuggestions(),
        getDescriptionSuggestions(),
      ]);
      const nameData = handleAction(nameResult);
      const descData = handleAction(descResult);
      if (nameData) setNameSuggestions(nameData);
      if (descData) setDescriptionSuggestions(descData);
    } catch (error) {
      // Ignore errors
    }
  };

  const handleAddNameSuggestion = async (value: string) => {
    if (!value || value.trim().length === 0) return;
    
    try {
      const result = await addNameSuggestion({ value });
      const data = handleAction(result);
      if (data) {
        setNameSuggestions([...nameSuggestions, data]);
        notifications.show({
          title: 'Succès',
          message: 'Suggestion ajoutée',
          color: 'green',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'ajout de la suggestion',
        color: 'red',
      });
    }
  };

  const handleAddDescriptionSuggestion = async (value: string) => {
    if (!value || value.trim().length === 0) return;
    
    try {
      const result = await addDescriptionSuggestion({ value });
      const data = handleAction(result);
      if (data) {
        setDescriptionSuggestions([...descriptionSuggestions, data]);
        notifications.show({
          title: 'Succès',
          message: 'Suggestion ajoutée',
          color: 'green',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'ajout de la suggestion',
        color: 'red',
      });
    }
  };

  const handleDeleteNameSuggestion = async (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value || value.trim().length === 0) return;
    
    try {
      const result = await deleteNameSuggestion({ value });
      const data = handleAction(result);
      if (data) {
        setNameSuggestions(nameSuggestions.filter(s => s.toLowerCase() !== value.toLowerCase().trim()));
        notifications.show({
          title: 'Succès',
          message: 'Suggestion supprimée',
          color: 'green',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression de la suggestion',
        color: 'red',
      });
    }
  };

  const handleDeleteDescriptionSuggestion = async (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value || value.trim().length === 0) return;
    
    try {
      const result = await deleteDescriptionSuggestion({ value });
      const data = handleAction(result);
      if (data) {
        setDescriptionSuggestions(descriptionSuggestions.filter(s => s.toLowerCase() !== value.toLowerCase().trim()));
        notifications.show({
          title: 'Succès',
          message: 'Suggestion supprimée',
          color: 'green',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression de la suggestion',
        color: 'red',
      });
    }
  };

  const loadWeeks = async () => {
    try {
      const result = await getAccountWeeks(account.id);
      const data = handleAction(result);
      if (data) {
        setWeeks(data);
      }
    } catch (error) {
      // Ignore errors
    }
  };

  const loadWeek = async (date: Date) => {
    try {
      setLoading(true);
      const result = await getOrCreateWeek(account.id, date);
      const data = handleAction(result);
      if (data) {
        setWeek(data);
        setWeekDateValue(new Date(data.weekStart));
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement de la semaine',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    const newDate = subWeeks(week.weekStart, 1);
    loadWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = addWeeks(week.weekStart, 1);
    loadWeek(newDate);
  };

  const handleWeekChange = (date: Date | null) => {
    if (date) {
      loadWeek(date);
    }
  };

  // Calculer le solde de la semaine précédente
  const previousWeek = useMemo(() => {
    return weeks
      .filter((w) => w.weekStart < week.weekStart)
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())[0];
  }, [weeks, week.weekStart]);

  const previousBalance = previousWeek ? Number(previousWeek.balance) : 0;

  // Calculer les soldes cumulés pour chaque transaction et trier par date
  const transactionsWithBalance = useMemo(() => {
    let runningBalance = previousBalance;
    
    // Créer une copie triée des transactions
    const sortedTransactions = [...week.transactions].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    return sortedTransactions.map((transaction) => {
      const amount = Number(transaction.amount);
      if (transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN') {
        runningBalance += amount;
      } else {
        // WITHDRAWAL ou TRANSFER_OUT
        runningBalance -= amount;
      }
      return {
        ...transaction,
        runningBalance,
      };
    });
  }, [week.transactions, previousBalance, sortOrder]);

  const currentBalance = transactionsWithBalance.length > 0
    ? transactionsWithBalance[transactionsWithBalance.length - 1].runningBalance
    : previousBalance;

  const balanceDifference = currentBalance - previousBalance;

  const handleSaveTransaction = async (transaction: {
    id?: string;
    date?: Date | string;
    type?: string;
    name?: string;
    description?: string | null;
    amount?: number;
    order?: number;
  }) => {
    try {
      setLoading(true);
      if (transaction.id) {
        // Update
        const result = await updateTransaction({
          id: transaction.id,
          date: transaction.date,
          type: transaction.type as any,
          name: transaction.name,
          description: transaction.description || undefined,
          amount: transaction.amount,
          order: transaction.order,
        });
        const data = handleAction(result);
        if (data) {
          notifications.show({
            title: 'Succès',
            message: 'Transaction mise à jour',
            color: 'green',
          });
          await loadWeek(week.weekStart);
          await loadWeeks();
          setEditingTransaction(null);
        }
      } else {
        // Create
        if (!transaction.date || !transaction.type || !transaction.name) {
          notifications.show({
            title: 'Erreur',
            message: 'Veuillez remplir tous les champs requis',
            color: 'red',
          });
          return;
        }

        const result = await createTransaction({
          weekId: week.id,
          date: transaction.date as Date | string,
          type: transaction.type as any,
          name: transaction.name!,
          description: transaction.description || undefined,
          amount: transaction.amount!,
          order: transaction.order || 0,
        });
        const data = handleAction(result);
        if (data) {
          notifications.show({
            title: 'Succès',
            message: 'Transaction créée',
            color: 'green',
          });
          await loadWeek(week.weekStart);
          await loadWeeks();
          await loadSuggestions();
          setNewTransaction(null);
        }
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la sauvegarde',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      setLoading(true);
      const result = await deleteTransaction({ id });
      const data = handleAction(result);
      if (data) {
        notifications.show({
          title: 'Succès',
          message: 'Transaction supprimée',
          color: 'green',
        });
        await loadWeek(week.weekStart);
        await loadWeeks();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const weekRange = `${format(week.weekStart, 'd MMM', { locale: fr })} - ${format(week.weekEnd, 'd MMM yyyy', { locale: fr })}`;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="md" align="center">
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => router.push(routes.bank.index)}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <div>
              <Title order={2} mb={4}>{account.name}</Title>
              <Text size="sm" c="dimmed">Gestion des transactions</Text>
            </div>
          </Group>
        </Group>

        {/* Week Selector & Summary Cards */}
        <Paper shadow="sm" p="lg" withBorder radius="md">
          <Stack gap="lg">
            <DatesProvider settings={{ locale: 'fr' }}>
              <Group align="center" wrap="nowrap" gap="md">
                <ActionIcon 
                  variant="light" 
                  onClick={handlePreviousWeek} 
                  disabled={loading} 
                  size="md"
                  radius="md"
                >
                  <IconChevronLeft size={18} />
                </ActionIcon>
                <Group gap="xs" align="center">
                  <Text size="sm" fw={500} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    Semaine du
                  </Text>
                  <DatePickerInput
                    value={weekDateValue}
                    onChange={(date) => {
                      const dateValue = date as unknown as Date | null;
                      setWeekDateValue(dateValue);
                      if (dateValue) {
                        handleWeekChange(dateValue);
                      }
                    }}
                    placeholder="Sélectionner le lundi"
                    valueFormat="D MMMM YYYY"
                    style={{ width: 180 }}
                    clearable={false}
                    radius="md"
                    size="sm"
                  />
                </Group>
                <ActionIcon 
                  variant="light" 
                  onClick={handleNextWeek} 
                  disabled={loading} 
                  size="md"
                  radius="md"
                >
                  <IconChevronRight size={18} />
                </ActionIcon>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <Text size="xs" c="dimmed" mb={2}>Période</Text>
                  <Text size="sm" fw={500}>{weekRange}</Text>
                </div>
              </Group>
            </DatesProvider>

            {/* Balance Cards */}
            <Group gap="md" grow>
              <Paper p="md" withBorder radius="md" style={{ background: 'var(--mantine-color-gray-0)' }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>Solde précédent</Text>
                  <Text size="xl" fw={700} c="dimmed">
                    {previousBalance.toFixed(2)} $
                  </Text>
                </Stack>
              </Paper>
              <Paper p="md" withBorder radius="md" style={{ background: 'var(--mantine-color-gray-0)' }}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>Solde actuel</Text>
                  <Text size="xl" fw={700}>
                    {currentBalance.toFixed(2)} $
                  </Text>
                </Stack>
              </Paper>
              <Paper 
                p="md" 
                withBorder 
                radius="md" 
                style={{ 
                  background: balanceDifference >= 0 
                    ? 'var(--mantine-color-green-0)' 
                    : 'var(--mantine-color-red-0)' 
                }}
              >
                <Stack gap={4}>
                  <Text size="xs" c="dimmed" fw={500}>Variation</Text>
                  <Text 
                    size="xl" 
                    fw={700} 
                    c={balanceDifference >= 0 ? 'green' : 'red'}
                  >
                    {balanceDifference >= 0 ? '+' : ''}{balanceDifference.toFixed(2)} $
                  </Text>
                </Stack>
              </Paper>
            </Group>
          </Stack>
        </Paper>

      <DatesProvider settings={{ locale: 'fr' }}>
        <Paper shadow="sm" withBorder radius="md" p={0}>
          {!newTransaction && (
            <Group p="md" justify="flex-end">
              <ActionIcon
                size="lg"
                variant="light"
                color="blue"
                onClick={() => {
                  setNewTransaction({
                    date: new Date(),
                    type: 'DEPOSIT',
                    name: '',
                    description: '',
                    amount: undefined,
                    order: week.transactions.length,
                  });
                }}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Group>
          )}
          <Table striped highlightOnHover>
            <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ padding: '16px' }}>
                <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                  <Text size="sm" fw={600}>Date</Text>
                  {sortOrder === 'asc' ? (
                    <IconArrowUp size={16} />
                  ) : (
                    <IconArrowDown size={16} />
                  )}
                </Group>
              </Table.Th>
              <Table.Th style={{ padding: '16px' }}>Type</Table.Th>
              <Table.Th style={{ padding: '16px' }}>Nom</Table.Th>
              <Table.Th style={{ padding: '16px' }}>Description</Table.Th>
              <Table.Th style={{ padding: '16px', textAlign: 'right' }}>Montant</Table.Th>
              <Table.Th style={{ padding: '16px', textAlign: 'right' }}>Solde</Table.Th>
              <Table.Th style={{ padding: '16px', textAlign: 'center' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortOrder === 'desc' && newTransaction && (
              <Table.Tr>
                <Table.Td style={{ padding: '16px' }}>
                  <DateInput
                    value={newTransaction.date ? new Date(newTransaction.date) : new Date()}
                    onChange={(date) => {
                      if (date) {
                        setNewTransaction({ ...newTransaction, date: date as any });
                      }
                    }}
                    size="xs"
                    valueFormat="MM/DD/YYYY"
                    key={newTransaction.date ? new Date(newTransaction.date).getTime() : Date.now()}
                  />
                </Table.Td>
                <Table.Td style={{ padding: '16px' }}>
                  <Select
                    data={transactionTypeOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                    value={newTransaction.type}
                    onChange={(value) => {
                      setNewTransaction({ ...newTransaction, type: value as any });
                    }}
                    size="xs"
                    placeholder="Type"
                  />
                </Table.Td>
                <Table.Td style={{ padding: '16px' }}>
                  <Autocomplete
                    data={nameSuggestions}
                    value={newTransaction.name || ''}
                    onChange={(value) => {
                      setNewTransaction({ ...newTransaction, name: value });
                    }}
                    size="xs"
                    placeholder="Nom"
                    renderOption={({ option }) => (
                      <Group justify="space-between" style={{ flex: 1 }}>
                        <Text size="xs" style={{ flex: 1 }}>{option.value}</Text>
                        <Popover
                          position="top"
                          withArrow
                          shadow="md"
                          withinPortal
                        >
                          <Popover.Target>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconTrash size={12} />
                            </ActionIcon>
                          </Popover.Target>
                          <Popover.Dropdown>
                            <Stack gap="xs" p="xs">
                              <Text size="sm" fw={500}>Supprimer la suggestion</Text>
                              <Text size="xs" c="dimmed">
                                Supprimer "{option.value}" des suggestions ?
                              </Text>
                              <Group gap="xs" justify="flex-end" mt="xs">
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  Annuler
                                </Button>
                                <Button
                                  size="xs"
                                  color="red"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNameSuggestion(option.value, e);
                                  }}
                                >
                                  Supprimer
                                </Button>
                              </Group>
                            </Stack>
                          </Popover.Dropdown>
                        </Popover>
                      </Group>
                    )}
                    comboboxProps={{ withinPortal: true }}
                    rightSection={
                      newTransaction.name &&
                      newTransaction.name.trim().length > 0 &&
                      !nameSuggestions.some(s => s.toLowerCase() === newTransaction.name?.toLowerCase().trim()) ? (
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddNameSuggestion(newTransaction.name!);
                          }}
                        >
                          <IconPlus size={14} />
                        </ActionIcon>
                      ) : null
                    }
                  />
                </Table.Td>
                <Table.Td style={{ padding: '16px' }}>
                  <Autocomplete
                    data={descriptionSuggestions}
                    value={newTransaction.description || ''}
                    onChange={(value) => {
                      setNewTransaction({ ...newTransaction, description: value || undefined });
                    }}
                    size="xs"
                    placeholder="Description"
                    renderOption={({ option }) => (
                      <Group justify="space-between" style={{ flex: 1 }}>
                        <Text size="xs" style={{ flex: 1 }}>{option.value}</Text>
                        <Popover
                          position="top"
                          withArrow
                          shadow="md"
                          withinPortal
                        >
                          <Popover.Target>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconTrash size={12} />
                            </ActionIcon>
                          </Popover.Target>
                          <Popover.Dropdown>
                            <Stack gap="xs" p="xs">
                              <Text size="sm" fw={500}>Supprimer la suggestion</Text>
                              <Text size="xs" c="dimmed">
                                Supprimer "{option.value}" des suggestions ?
                              </Text>
                              <Group gap="xs" justify="flex-end" mt="xs">
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  Annuler
                                </Button>
                                <Button
                                  size="xs"
                                  color="red"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDescriptionSuggestion(option.value, e);
                                  }}
                                >
                                  Supprimer
                                </Button>
                              </Group>
                            </Stack>
                          </Popover.Dropdown>
                        </Popover>
                      </Group>
                    )}
                    comboboxProps={{ withinPortal: true }}
                    rightSection={
                      newTransaction.description &&
                      newTransaction.description.trim().length > 0 &&
                      !descriptionSuggestions.some(s => s.toLowerCase() === newTransaction.description?.toLowerCase().trim()) ? (
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddDescriptionSuggestion(newTransaction.description!);
                          }}
                        >
                          <IconPlus size={14} />
                        </ActionIcon>
                      ) : null
                    }
                  />
                </Table.Td>
                <Table.Td style={{ padding: '16px', textAlign: 'right' }}>
                  <NumberInput
                    value={newTransaction.amount ? Number(newTransaction.amount) : undefined}
                    onChange={(value) => {
                      setNewTransaction({
                        ...newTransaction,
                        amount: value ? Number(value) : undefined,
                      });
                    }}
                    size="xs"
                    min={0}
                    decimalScale={2}
                    placeholder="0.00"
                    style={{ width: '100%' }}
                  />
                </Table.Td>
                <Table.Td style={{ padding: '16px', textAlign: 'right' }}>
                  <Text size="sm" c="dimmed">-</Text>
                </Table.Td>
                <Table.Td style={{ padding: '16px', textAlign: 'center' }}>
                  <Group gap="xs" justify="center" wrap="nowrap">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="green"
                      onClick={() => {
                        handleSaveTransaction(newTransaction);
                      }}
                      disabled={!newTransaction.date || !newTransaction.type || !newTransaction.name || !newTransaction.amount}
                    >
                      <IconCheck size={18} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="gray"
                      onClick={() => setNewTransaction(null)}
                    >
                      <IconX size={18} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            )}
            {transactionsWithBalance.map((transaction) => {
              const isEditing = editingTransaction === transaction.id;
              return (
                <Table.Tr key={transaction.id}>
                  <Table.Td style={{ padding: '16px' }}>
                    {isEditing ? (
                      <DateInput
                        value={editingTransactionData?.date ? new Date(editingTransactionData.date) : new Date(transaction.date)}
                        onChange={(date) => {
                            console.log(date)
                          if (date && editingTransactionData) {
                            setEditingTransactionData({ ...editingTransactionData, date: date as any });
                          }
                        }}
                        size="xs"
                        valueFormat="DD/MM/YYYY"
                      />
                    ) : (
                      <Text size="sm">{format(new Date(transaction.date), 'dd/MM/yyyy', { locale: fr })}</Text>
                    )}
                  </Table.Td>
                  <Table.Td style={{ padding: '16px' }}>
                    {isEditing ? (
                      <Select
                        data={transactionTypeOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                        value={editingTransactionData?.type || transaction.type}
                        onChange={(value) => {
                          if (value && editingTransactionData) {
                            setEditingTransactionData({ ...editingTransactionData, type: value as any });
                          }
                        }}
                        size="xs"
                      />
                    ) : (
                      (() => {
                        const typeInfo = getTransactionTypeInfo(transaction.type);
                        const IconComponent = typeInfo.icon;
                        return (
                          <Badge
                            leftSection={<IconComponent size={14} />}
                            color={typeInfo.color}
                            variant="light"
                            size="sm"
                          >
                            {typeInfo.label}
                          </Badge>
                        );
                      })()
                    )}
                  </Table.Td>
                  <Table.Td style={{ padding: '16px' }}>
                    {isEditing ? (
                      <Autocomplete
                        data={nameSuggestions}
                        value={editingTransactionData?.name || transaction.name}
                        onChange={(value) => {
                          if (editingTransactionData) {
                            setEditingTransactionData({ ...editingTransactionData, name: value });
                          }
                        }}
                        size="xs"
                        renderOption={({ option }) => (
                          <Group justify="space-between" style={{ flex: 1 }}>
                            <Text size="xs" style={{ flex: 1 }}>{option.value}</Text>
                            <Popover
                              position="top"
                              withArrow
                              shadow="md"
                              withinPortal
                            >
                              <Popover.Target>
                                <ActionIcon
                                  size="xs"
                                  variant="subtle"
                                  color="red"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <IconTrash size={12} />
                                </ActionIcon>
                              </Popover.Target>
                              <Popover.Dropdown>
                                <Stack gap="xs" p="xs">
                                  <Text size="sm" fw={500}>Supprimer la suggestion</Text>
                                  <Text size="xs" c="dimmed">
                                    Supprimer "{option.value}" des suggestions ?
                                  </Text>
                                  <Group gap="xs" justify="flex-end" mt="xs">
                                    <Button
                                      size="xs"
                                      variant="subtle"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    >
                                      Annuler
                                    </Button>
                                    <Button
                                      size="xs"
                                      color="red"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNameSuggestion(option.value, e);
                                      }}
                                    >
                                      Supprimer
                                    </Button>
                                  </Group>
                                </Stack>
                              </Popover.Dropdown>
                            </Popover>
                          </Group>
                        )}
                        rightSection={
                          editingTransactionData?.name &&
                          editingTransactionData.name.trim().length > 0 &&
                          !nameSuggestions.some(s => s.toLowerCase() === editingTransactionData.name?.toLowerCase().trim()) ? (
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddNameSuggestion(editingTransactionData.name!);
                              }}
                            >
                              <IconPlus size={14} />
                            </ActionIcon>
                          ) : null
                        }
                      />
                    ) : (
                      transaction.name
                    )}
                  </Table.Td>
                  <Table.Td>
                    {isEditing ? (
                      <Autocomplete
                        data={descriptionSuggestions}
                        value={editingTransactionData?.description || transaction.description || ''}
                        onChange={(value) => {
                          if (editingTransactionData) {
                            setEditingTransactionData({ ...editingTransactionData, description: value || undefined });
                          }
                        }}
                        size="xs"
                        renderOption={({ option }) => (
                          <Group justify="space-between" style={{ flex: 1 }}>
                            <Text size="xs" style={{ flex: 1 }}>{option.value}</Text>
                            <Popover
                              position="top"
                              withArrow
                              shadow="md"
                              withinPortal
                            >
                              <Popover.Target>
                                <ActionIcon
                                  size="xs"
                                  variant="subtle"
                                  color="red"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <IconTrash size={12} />
                                </ActionIcon>
                              </Popover.Target>
                              <Popover.Dropdown>
                                <Stack gap="xs" p="xs">
                                  <Text size="sm" fw={500}>Supprimer la suggestion</Text>
                                  <Text size="xs" c="dimmed">
                                    Supprimer "{option.value}" des suggestions ?
                                  </Text>
                                  <Group gap="xs" justify="flex-end" mt="xs">
                                    <Button
                                      size="xs"
                                      variant="subtle"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    >
                                      Annuler
                                    </Button>
                                    <Button
                                      size="xs"
                                      color="red"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDescriptionSuggestion(option.value, e);
                                      }}
                                    >
                                      Supprimer
                                    </Button>
                                  </Group>
                                </Stack>
                              </Popover.Dropdown>
                            </Popover>
                          </Group>
                        )}
                        rightSection={
                          editingTransactionData?.description &&
                          editingTransactionData.description.trim().length > 0 &&
                          !descriptionSuggestions.some(s => s.toLowerCase() === editingTransactionData.description?.toLowerCase().trim()) ? (
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddDescriptionSuggestion(editingTransactionData.description!);
                              }}
                            >
                              <IconPlus size={14} />
                            </ActionIcon>
                          ) : null
                        }
                      />
                    ) : (
                      transaction.description || '-'
                    )}
                  </Table.Td>
                  <Table.Td style={{ padding: '16px', textAlign: 'right' }}>
                    {isEditing ? (
                      <NumberInput
                        value={editingTransactionData?.amount !== undefined ? Number(editingTransactionData.amount) : Number(transaction.amount)}
                        onChange={(value) => {
                          if (editingTransactionData) {
                            setEditingTransactionData({
                              ...editingTransactionData,
                              amount: value ? Number(value) : undefined,
                            });
                          }
                        }}
                        size="xs"
                        min={0}
                        decimalScale={2}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <Text 
                        size="sm" 
                        fw={600}
                        c={transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN' ? 'green' : 'red'}
                      >
                        {(transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN' ? '+' : '-') + Number(transaction.amount).toFixed(2)} $
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td style={{ padding: '16px', textAlign: 'right' }}>
                    <Text size="sm" fw={600} c="dimmed">
                      {transaction.runningBalance.toFixed(2)} $
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ padding: '16px', textAlign: 'center' }}>
                    <Group gap="xs" justify="center" wrap="nowrap">
                      {isEditing ? (
                        <>
                          <ActionIcon
                            color="green"
                            variant="light"
                            onClick={() => {
                              if (editingTransactionData) {
                                handleSaveTransaction({ 
                                  id: transaction.id,
                                  date: editingTransactionData.date || transaction.date,
                                  type: editingTransactionData.type || transaction.type,
                                  name: editingTransactionData.name || transaction.name,
                                  description: editingTransactionData.description !== undefined ? editingTransactionData.description : (transaction.description || null),
                                  amount: editingTransactionData.amount !== undefined ? editingTransactionData.amount : Number(transaction.amount),
                                  order: editingTransactionData.order !== undefined ? editingTransactionData.order : transaction.order,
                                });
                              }
                            }}
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                          <ActionIcon
                            color="gray"
                            variant="light"
                            onClick={() => {
                              setEditingTransaction(null);
                              setEditingTransactionData(null);
                            }}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        </>
                      ) : (
                        <>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            color="blue"
                            onClick={() => {
                              setEditingTransaction(transaction.id);
                              setEditingTransactionData({
                                date: transaction.date,
                                type: transaction.type,
                                name: transaction.name,
                                description: transaction.description ? transaction.description : undefined,
                                amount: Number(transaction.amount),
                                order: transaction.order,
                              });
                            }}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <Popover
                            position="top"
                            withArrow
                            shadow="md"
                            opened={deletePopoverOpened === transaction.id}
                            onChange={(opened) => setDeletePopoverOpened(opened ? transaction.id : null)}
                          >
                            <Popover.Target>
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                size="sm"
                                onClick={() => setDeletePopoverOpened(transaction.id)}
                                disabled={loading || isEditing}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Popover.Target>
                            <Popover.Dropdown>
                              <Stack gap="xs" p="xs">
                                <Text size="sm" fw={500}>Confirmer la suppression</Text>
                                <Text size="xs" c="dimmed">
                                  Êtes-vous sûr de vouloir supprimer cette transaction ?
                                </Text>
                                <Group gap="xs" justify="flex-end" mt="xs">
                                  <Button
                                    size="xs"
                                    variant="subtle"
                                    onClick={() => setDeletePopoverOpened(null)}
                                  >
                                    Annuler
                                  </Button>
                                  <Button
                                    size="xs"
                                    color="red"
                                    onClick={() => {
                                      handleDeleteTransaction(transaction.id);
                                      setDeletePopoverOpened(null);
                                    }}
                                  >
                                    Supprimer
                                  </Button>
                                </Group>
                              </Stack>
                            </Popover.Dropdown>
                          </Popover>
                        </>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}

            {sortOrder === 'asc' && newTransaction && (
              <Table.Tr>
                <Table.Td style={{ padding: '16px' }}>
                  <DateInput
                    value={newTransaction.date ? new Date(newTransaction.date) : new Date()}
                    onChange={(date) => {
                      if (date) {
                        setNewTransaction({ ...newTransaction, date: date as any });
                      }
                    }}
                    size="xs"
                    valueFormat="MM/DD/YYYY"
                    key={newTransaction.date ? new Date(newTransaction.date).getTime() : Date.now()}
                  />
                </Table.Td>
                <Table.Td style={{ padding: '16px' }}>
                  <Select
                    data={transactionTypeOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                    value={newTransaction.type}
                    onChange={(value) => {
                      setNewTransaction({ ...newTransaction, type: value as any });
                    }}
                    size="xs"
                    placeholder="Type"
                  />
                </Table.Td>
                <Table.Td style={{ padding: '16px' }}>
                  <Autocomplete
                    data={nameSuggestions}
                    value={newTransaction.name || ''}
                    onChange={(value) => {
                      setNewTransaction({ ...newTransaction, name: value });
                    }}
                    size="xs"
                    placeholder="Nom"
                    renderOption={({ option }) => (
                      <Group justify="space-between" style={{ flex: 1 }}>
                        <Text size="xs" style={{ flex: 1 }}>{option.value}</Text>
                        <Popover
                          position="top"
                          withArrow
                          shadow="md"
                          withinPortal
                        >
                          <Popover.Target>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconTrash size={12} />
                            </ActionIcon>
                          </Popover.Target>
                          <Popover.Dropdown>
                            <Stack gap="xs" p="xs">
                              <Text size="sm" fw={500}>Supprimer la suggestion</Text>
                              <Text size="xs" c="dimmed">
                                Supprimer "{option.value}" des suggestions ?
                              </Text>
                              <Group gap="xs" justify="flex-end" mt="xs">
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  Annuler
                                </Button>
                                <Button
                                  size="xs"
                                  color="red"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNameSuggestion(option.value, e);
                                  }}
                                >
                                  Supprimer
                                </Button>
                              </Group>
                            </Stack>
                          </Popover.Dropdown>
                        </Popover>
                      </Group>
                    )}
                    comboboxProps={{ withinPortal: true }}
                    rightSection={
                      newTransaction.name &&
                      newTransaction.name.trim().length > 0 &&
                      !nameSuggestions.some(s => s.toLowerCase() === newTransaction.name?.toLowerCase().trim()) ? (
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddNameSuggestion(newTransaction.name!);
                          }}
                        >
                          <IconPlus size={14} />
                        </ActionIcon>
                      ) : null
                    }
                  />
                </Table.Td>
                <Table.Td style={{ padding: '16px' }}>
                  <Autocomplete
                    data={descriptionSuggestions}
                    value={newTransaction.description || ''}
                    onChange={(value) => {
                      setNewTransaction({ ...newTransaction, description: value || undefined });
                    }}
                    size="xs"
                    placeholder="Description"
                    renderOption={({ option }) => (
                      <Group justify="space-between" style={{ flex: 1 }}>
                        <Text size="xs" style={{ flex: 1 }}>{option.value}</Text>
                        <Popover
                          position="top"
                          withArrow
                          shadow="md"
                          withinPortal
                        >
                          <Popover.Target>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <IconTrash size={12} />
                            </ActionIcon>
                          </Popover.Target>
                          <Popover.Dropdown>
                            <Stack gap="xs" p="xs">
                              <Text size="sm" fw={500}>Supprimer la suggestion</Text>
                              <Text size="xs" c="dimmed">
                                Supprimer "{option.value}" des suggestions ?
                              </Text>
                              <Group gap="xs" justify="flex-end" mt="xs">
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  Annuler
                                </Button>
                                <Button
                                  size="xs"
                                  color="red"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDescriptionSuggestion(option.value, e);
                                  }}
                                >
                                  Supprimer
                                </Button>
                              </Group>
                            </Stack>
                          </Popover.Dropdown>
                        </Popover>
                      </Group>
                    )}
                    comboboxProps={{ withinPortal: true }}
                    rightSection={
                      newTransaction.description &&
                      newTransaction.description.trim().length > 0 &&
                      !descriptionSuggestions.some(s => s.toLowerCase() === newTransaction.description?.toLowerCase().trim()) ? (
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddDescriptionSuggestion(newTransaction.description!);
                          }}
                        >
                          <IconPlus size={14} />
                        </ActionIcon>
                      ) : null
                    }
                  />
                </Table.Td>
                <Table.Td style={{ padding: '16px', textAlign: 'right' }}>
                  <NumberInput
                    value={newTransaction.amount ? Number(newTransaction.amount) : undefined}
                    onChange={(value) => {
                      setNewTransaction({
                        ...newTransaction,
                        amount: value ? Number(value) : undefined,
                      });
                    }}
                    size="xs"
                    min={0}
                    decimalScale={2}
                    placeholder="0.00"
                    style={{ width: '100%' }}
                  />
                </Table.Td>
                <Table.Td style={{ padding: '16px', textAlign: 'right' }}>
                  <Text size="sm" c="dimmed">-</Text>
                </Table.Td>
                <Table.Td style={{ padding: '16px', textAlign: 'center' }}>
                  <Group gap="xs" justify="center" wrap="nowrap">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="green"
                      onClick={() => {
                        handleSaveTransaction(newTransaction);
                      }}
                      disabled={!newTransaction.date || !newTransaction.type || !newTransaction.name || !newTransaction.amount}
                    >
                      <IconCheck size={18} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="gray"
                      onClick={() => setNewTransaction(null)}
                    >
                      <IconX size={18} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        {!newTransaction && (
          <Group p="lg" justify="center">
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => {
                setNewTransaction({
                  date: new Date(),
                  type: 'DEPOSIT',
                  name: '',
                  description: '',
                  amount: undefined,
                  order: week.transactions.length,
                });
              }}
              size="md"
              radius="md"
            >
              Ajouter une transaction
            </Button>
          </Group>
        )}
        </Paper>
      </DatesProvider>
      </Stack>
    </Container>
  );
}

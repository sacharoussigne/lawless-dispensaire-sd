'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
  Paper,
  Table,
  TextInput,
  NumberInput,
  Select,
  ActionIcon,
  Text,
  Badge,
  Stack,
  Autocomplete,
} from '@mantine/core';
import { DatePickerInput, DateInput, DatesProvider } from '@mantine/dates';
import 'dayjs/locale/fr';
import { IconPlus, IconTrash, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
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

interface BankAccountPageClientProps {
  account: BankAccountWithRelations;
  initialWeek: BankAccountWeek & { transactions: BankTransaction[] };
}

const transactionTypeOptions = [
  { value: 'DEPOSIT', label: 'Dépôt' },
  { value: 'WITHDRAWAL', label: 'Retrait' },
  { value: 'TRANSFER_IN', label: 'Transfert entrant' },
  { value: 'TRANSFER_OUT', label: 'Transfert sortant' },
];

export default function BankAccountPageClient({
  account,
  initialWeek,
}: BankAccountPageClientProps) {
  const router = useRouter();
  const [week, setWeek] = useState(initialWeek);
  const [weeks, setWeeks] = useState<Array<BankAccountWeek & { transactions: BankTransaction[] }>>([]);
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

  // Calculer les soldes cumulés pour chaque transaction
  const transactionsWithBalance = useMemo(() => {
    let runningBalance = previousBalance;
    return week.transactions.map((transaction) => {
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
  }, [week.transactions, previousBalance]);

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
      <Group justify="space-between" mb="xl">
        <Title order={1}>{account.name}</Title>
        <Button variant="default" onClick={() => router.push(routes.bank.index)}>
          Retour
        </Button>
      </Group>

      <Paper shadow="sm" p="md" withBorder mb="md">
        <Stack gap="md">
          <DatesProvider settings={{ locale: 'fr' }}>
            <Group align="flex-end" wrap="nowrap">
              <ActionIcon variant="light" onClick={handlePreviousWeek} disabled={loading} size="lg">
                <IconChevronLeft size={20} />
              </ActionIcon>
              <DatePickerInput
                value={weekDateValue}
                onChange={(date) => {
                  const dateValue = date as unknown as Date | null;
                  setWeekDateValue(dateValue);
                  if (dateValue) {
                    handleWeekChange(dateValue);
                  }
                }}
                label="Semaine"
                placeholder="Sélectionner le lundi de la semaine"
                style={{ flex: 1, minWidth: 200 }}
                clearable={false}
              />
              <ActionIcon variant="light" onClick={handleNextWeek} disabled={loading} size="lg">
                <IconChevronRight size={20} />
              </ActionIcon>
              <Text size="sm" c="dimmed" fw={500} style={{ minWidth: 150 }}>
                {weekRange}
              </Text>
            </Group>
          </DatesProvider>

          <Group>
            <Text size="sm">
              <strong>Solde semaine précédente:</strong> {previousBalance.toFixed(2)} $
            </Text>
            <Text size="sm">
              <strong>Solde actuel:</strong> {currentBalance.toFixed(2)} $
            </Text>
            <Badge color={balanceDifference >= 0 ? 'green' : 'red'}>
              {balanceDifference >= 0 ? '+' : ''}{balanceDifference.toFixed(2)} $
            </Badge>
          </Group>
        </Stack>
      </Paper>

      <DatesProvider settings={{ locale: 'fr' }}>
        <Paper shadow="sm" withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 120 }}>Date</Table.Th>
              <Table.Th style={{ width: 150 }}>Type</Table.Th>
              <Table.Th style={{ width: 200 }}>Nom</Table.Th>
              <Table.Th style={{ width: 200 }}>Description</Table.Th>
              <Table.Th style={{ width: 120 }}>Montant</Table.Th>
              <Table.Th style={{ width: 120 }}>Solde restant</Table.Th>
              <Table.Th style={{ width: 80 }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {transactionsWithBalance.map((transaction) => {
              const isEditing = editingTransaction === transaction.id;
              return (
                <Table.Tr key={transaction.id}>
                  <Table.Td>
                    {isEditing ? (
                      <DateInput
                        value={editingTransactionData?.date ? new Date(editingTransactionData.date) : new Date(transaction.date)}
                        onChange={(date) => {
                          if (date && editingTransactionData) {
                            setEditingTransactionData({ ...editingTransactionData, date: date as any });
                          }
                        }}
                        size="xs"
                        valueFormat="DD/MM/YYYY"
                      />
                    ) : (
                      format(new Date(transaction.date), 'dd/MM/yyyy', { locale: fr })
                    )}
                  </Table.Td>
                  <Table.Td>
                    {isEditing ? (
                      <Select
                        data={transactionTypeOptions}
                        value={editingTransactionData?.type || transaction.type}
                        onChange={(value) => {
                          if (value && editingTransactionData) {
                            setEditingTransactionData({ ...editingTransactionData, type: value as any });
                          }
                        }}
                        size="xs"
                      />
                    ) : (
                      transactionTypeOptions.find((opt) => opt.value === transaction.type)?.label
                    )}
                  </Table.Td>
                  <Table.Td>
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
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={(e) => handleDeleteNameSuggestion(option.value, e)}
                            >
                              <IconTrash size={12} />
                            </ActionIcon>
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
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={(e) => handleDeleteDescriptionSuggestion(option.value, e)}
                            >
                              <IconTrash size={12} />
                            </ActionIcon>
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
                  <Table.Td>
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
                      />
                    ) : (
                      <Text size="sm" c={transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN' ? 'green' : 'red'}>
                        {(transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN' ? '+' : '-') + Number(transaction.amount).toFixed(2)} $
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {transaction.runningBalance.toFixed(2)} $
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      {isEditing ? (
                        <>
                          <Button
                            size="xs"
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
                            Enregistrer
                          </Button>
                          <Button
                            size="xs"
                            variant="default"
                            onClick={() => {
                              setEditingTransaction(null);
                              setEditingTransactionData(null);
                            }}
                          >
                            Annuler
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="xs"
                          variant="light"
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
                          Modifier
                        </Button>
                      )}
                      <ActionIcon
                        color="red"
                        variant="light"
                        size="sm"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        disabled={loading || isEditing}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}

            {newTransaction && (
              <Table.Tr>
                <Table.Td>
                  <DateInput
                    value={newTransaction.date ? new Date(newTransaction.date) : new Date()}
                    onChange={(date) => {
                      if (date) {
                        setNewTransaction({ ...newTransaction, date: date as any });
                      }
                    }}
                    size="xs"
                    valueFormat="MM/DD/YYYY"
                  />
                </Table.Td>
                <Table.Td>
                  <Select
                    data={transactionTypeOptions}
                    value={newTransaction.type}
                    onChange={(value) => {
                      setNewTransaction({ ...newTransaction, type: value as any });
                    }}
                    size="xs"
                    placeholder="Type"
                  />
                </Table.Td>
                <Table.Td>
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
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="red"
                          onClick={(e) => handleDeleteNameSuggestion(option.value, e)}
                        >
                          <IconTrash size={12} />
                        </ActionIcon>
                      </Group>
                    )}
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
                <Table.Td>
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
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color="red"
                          onClick={(e) => handleDeleteDescriptionSuggestion(option.value, e)}
                        >
                          <IconTrash size={12} />
                        </ActionIcon>
                      </Group>
                    )}
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
                <Table.Td>
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
                  />
                </Table.Td>
                <Table.Td>-</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      onClick={() => {
                        handleSaveTransaction(newTransaction);
                      }}
                      disabled={!newTransaction.date || !newTransaction.type || !newTransaction.name || !newTransaction.amount}
                    >
                      Enregistrer
                    </Button>
                    <Button
                      size="xs"
                      variant="default"
                      onClick={() => setNewTransaction(null)}
                    >
                      Annuler
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        {!newTransaction && (
          <Group p="md">
            <Button
              leftSection={<IconPlus size={16} />}
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
              Ajouter une transaction
            </Button>
          </Group>
        )}
        </Paper>
      </DatesProvider>
    </Container>
  );
}

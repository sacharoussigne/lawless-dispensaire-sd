'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
  Paper,
  NumberInput,
  Select,
  ActionIcon,
  Text,
  Badge,
  Stack,
  Popover,
  MultiSelect,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { DateInput, DatesProvider } from '@mantine/dates';
import 'dayjs/locale/fr';
import { 
  IconPlus, 
  IconTrash, 
  IconChevronLeft,
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
import { addParisWeeks } from '@/lib/bankWeek';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { BankAccountWithRelations } from '@/types/bankAccounts';
import type { BankAccountWeek, BankTransaction } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { routes } from '@/types/routes';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { WeekNavigation } from '@/app/_components/WeekNavigation/WeekNavigation';
import { SuggestionAutocomplete } from '@/app/_components/SuggestionAutocomplete/SuggestionAutocomplete';
import { SummaryCards } from '@/app/_components/SummaryCards/SummaryCards';

type SerializedBankAccountWeek = Omit<BankAccountWeek, 'balance'> & {
  balance: number;
  transactions: Array<Omit<BankTransaction, 'amount'> & { amount: number }>;
};

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

function normalizeSerializedWeek(week: SerializedBankAccountWeek): SerializedBankAccountWeek {
  return {
    ...week,
    weekStart: toDate(week.weekStart as Date | string | number),
    weekEnd: toDate(week.weekEnd as Date | string | number),
    createdAt: toDate(week.createdAt as Date | string | number),
    updatedAt: toDate(week.updatedAt as Date | string | number),
    transactions: week.transactions.map((t) => ({
      ...t,
      date: toDate(t.date as Date | string | number),
      createdAt: toDate(t.createdAt as Date | string | number),
      updatedAt: toDate(t.updatedAt as Date | string | number),
    })),
  };
}

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
  const [week, setWeek] = useState<SerializedBankAccountWeek>(() => normalizeSerializedWeek(initialWeek));
  const [weeks, setWeeks] = useState<SerializedBankAccountWeek[]>([]);
  const [loading, setLoading] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);
  const [weekDateValue, setWeekDateValue] = useState<Date | null>(() =>
    new Date(normalizeSerializedWeek(initialWeek).weekStart),
  );
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

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
      // Error handled by handleAction
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

  const handleDeleteNameSuggestion = async (value: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const handleDeleteDescriptionSuggestion = async (value: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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
        setWeeks(data.map(normalizeSerializedWeek));
      }
    } catch (error) {
      // Error handled by handleAction
    }
  };

  const loadWeek = async (date: Date) => {
    try {
      setLoading(true);
      const result = await getOrCreateWeek(account.id, date);
      const data = handleAction(result);
      if (data) {
        const normalized = normalizeSerializedWeek(data);
        setWeek(normalized);
        setWeekDateValue(new Date(normalized.weekStart));
      } else {
        notifications.show({
          title: 'Erreur',
          message: 'Impossible de charger cette semaine.',
          color: 'red',
        });
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
    loadWeek(addParisWeeks(week.weekStart, -1));
  };

  const handleNextWeek = () => {
    loadWeek(addParisWeeks(week.weekStart, 1));
  };

  const handleWeekChange = async (date: Date | null) => {
    if (date) {
      await loadWeek(date);
    }
  };

  // Calculate previous week balance
  const previousWeek = useMemo(() => {
    const currentStart = toDate(week.weekStart).getTime();
    return weeks
      .filter((w) => toDate(w.weekStart).getTime() < currentStart)
      .sort((a, b) => toDate(b.weekStart).getTime() - toDate(a.weekStart).getTime())[0];
  }, [weeks, week.weekStart]);

  const previousBalance = previousWeek ? Number(previousWeek.balance) : 0;

  // Calculate current balance based on ALL transactions (for top cards)
  const currentBalance = useMemo(() => {
    let runningBalance = previousBalance;
    
    // Sort all transactions by date then by order
    const sortedAllTransactions = [...week.transactions].sort((a, b) => {
      const dateA = new Date(a.date);
      dateA.setHours(0, 0, 0, 0);
      const dateATime = dateA.getTime();
      
      const dateB = new Date(b.date);
      dateB.setHours(0, 0, 0, 0);
      const dateBTime = dateB.getTime();
      
      if (dateATime !== dateBTime) {
        return dateATime - dateBTime;
      }
      
      return a.order - b.order;
    });
    
    for (const transaction of sortedAllTransactions) {
      const amount = Number(transaction.amount);
      if (transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN') {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }
    }
    
    return runningBalance;
  }, [week.transactions, previousBalance]);

  // Filter and sort transactions according to filters and sort order
  const filteredTransactions = useMemo(() => {
    let transactions = week.transactions;
    if (typeFilter.length > 0) {
      transactions = week.transactions.filter((t) => typeFilter.includes(t.type));
    }
    
    return [...transactions].sort((a, b) => {
      // Normalize dates to compare only the date (without time)
      const dateA = new Date(a.date);
      dateA.setHours(0, 0, 0, 0);
      const dateATime = dateA.getTime();
      
      const dateB = new Date(b.date);
      dateB.setHours(0, 0, 0, 0);
      const dateBTime = dateB.getTime();
      
      if (dateATime !== dateBTime) {
        return sortOrder === 'asc' ? dateATime - dateBTime : dateBTime - dateATime;
      }
      
      return sortOrder === 'asc' ? a.order - b.order : b.order - a.order;
    });
  }, [week.transactions, sortOrder, typeFilter]);

  // Prepare records for DataTable (include new transaction if it exists)
  const dataTableRecords = useMemo(() => {
    const records = [...filteredTransactions];
    
    if (newTransaction) {
      const newRecord = {
        id: 'new-transaction',
        isNew: true,
        date: newTransaction.date || new Date(),
        type: newTransaction.type || 'DEPOSIT',
        name: newTransaction.name || '',
        description: newTransaction.description || null,
        amount: newTransaction.amount || 0,
        order: newTransaction.order || 0,
      };
      
      // Add at top if sortOrder === 'desc', at bottom if sortOrder === 'asc'
      if (sortOrder === 'desc') {
        records.unshift(newRecord as any);
      } else {
        records.push(newRecord as any);
      }
    }
    
    return records;
  }, [filteredTransactions, newTransaction, sortOrder]);

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

  const handleReorderTransaction = async (transactionId: string, direction: 'up' | 'down') => {
    try {
      setLoading(true);
      
      // Find transaction to reorder
      const transaction = week.transactions.find((t) => t.id === transactionId);
      if (!transaction) return;

      // Normalize transaction date
      const transactionDate = new Date(transaction.date);
      transactionDate.setHours(0, 0, 0, 0);

      // Find all transactions with the same date
      const sameDateTransactions = week.transactions.filter((t) => {
        const tDate = new Date(t.date);
        tDate.setHours(0, 0, 0, 0);
        return tDate.getTime() === transactionDate.getTime();
      });

      // Don't reorder if there's only one transaction for this date
      if (sameDateTransactions.length < 2) {
        return;
      }

      // Sort by order to determine position
      const sortedSameDate = [...sameDateTransactions].sort((a, b) => a.order - b.order);
      const currentIndex = sortedSameDate.findIndex((t) => t.id === transactionId);

      // Invert direction according to table order
      // In desc mode, "up" in table = "down" in real order, and vice versa
      const actualDirection = sortOrder === 'desc' 
        ? (direction === 'up' ? 'down' : 'up')
        : direction;

      if (actualDirection === 'up' && currentIndex === 0) {
        // Already in first position, do nothing
        return;
      }

      if (actualDirection === 'down' && currentIndex === sortedSameDate.length - 1) {
        // Already in last position, do nothing
        return;
      }

      // Calculer le nouvel ordre
      const targetIndex = actualDirection === 'up' ? currentIndex - 1 : currentIndex + 1;
      const targetTransaction = sortedSameDate[targetIndex];
      const newOrder = targetTransaction.order;

      // Mettre à jour l'ordre de la transaction
      const result = await updateTransaction({
        id: transactionId,
        order: newOrder,
      });
      const data = handleAction(result);
      if (data) {
        notifications.show({
          title: 'Succès',
          message: 'Ordre mis à jour',
          color: 'green',
        });
        await loadWeek(week.weekStart);
        await loadWeeks();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du réordonnancement',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

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

        <Paper shadow="sm" p="lg" withBorder radius="md">
          <Stack gap="lg">
            <WeekNavigation
              weekStart={week.weekStart}
              weekEnd={week.weekEnd}
              weekDateValue={weekDateValue}
              onWeekChange={handleWeekChange}
              onPreviousWeek={handlePreviousWeek}
              onNextWeek={handleNextWeek}
              loading={loading}
            />

            <SummaryCards
              cards={[
                {
                  label: 'Solde précédent',
                  value: previousBalance,
                  color: 'dimmed',
                },
                {
                  label: 'Solde actuel',
                  value: currentBalance,
                },
                {
                  label: 'Variation',
                  value: balanceDifference,
                  color: balanceDifference >= 0 ? 'green' : 'red',
                  backgroundColor:
                    balanceDifference >= 0
                      ? 'var(--mantine-color-green-0)'
                      : 'var(--mantine-color-red-0)',
                  formatValue: (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)} $`,
                },
              ]}
            />
          </Stack>
        </Paper>

      <DatesProvider settings={{ locale: 'fr' }}>
        <ActiveFilters
          filters={[
            {
              label: 'Type',
              value: typeFilter.length > 0 ? typeFilter.join(', ') : null,
              onRemove: () => setTypeFilter([]),
              displayValue: typeFilter.length > 0
                ? typeFilter
                    .map((type) => {
                      const typeInfo = transactionTypeOptions.find(opt => opt.value === type);
                      return typeInfo ? typeInfo.label : type;
                    })
                    .join(', ')
                : undefined,
            },
          ]}
        />
        <Paper shadow="sm" withBorder radius="md" p={0}>
          {!newTransaction && (
            <Group p="md" justify="flex-end">
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
                size="sm"
                radius="md"
              >
                Ajouter une transaction
              </Button>
            </Group>
          )}
          <DataTable
            records={dataTableRecords}
            columns={[
              {
                accessor: 'date',
                title: 'Date',
                sortable: true,
                render: (transaction: any) => {
                  const isNew = transaction.isNew;
                  const isEditing = !isNew && editingTransaction === transaction.id;
                  
                  if (isNew) {
                    return (
                      <DateInput
                        value={newTransaction?.date ? new Date(newTransaction.date) : new Date()}
                        onChange={(date) => {
                          if (date && newTransaction) {
                            setNewTransaction({ ...newTransaction, date: date as any });
                          }
                        }}
                        size="xs"
                        valueFormat="DD/MM/YYYY"
                      />
                    );
                  }
                  
                  if (isEditing) {
                    return (
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
                    );
                  }
                  
                  return <Text size="sm">{format(new Date(transaction.date), 'dd/MM/yyyy', { locale: fr })}</Text>;
                },
              },
              {
                accessor: 'type',
                title: 'Type',
                sortable: false,
                filter: (
                  <MultiSelect
                    placeholder="Filtrer par type"
                    data={transactionTypeOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                    value={typeFilter}
                    onChange={setTypeFilter}
                    clearable
                    style={{ minWidth: 200 }}
                    size="xs"
                  />
                ),
                render: (transaction: any) => {
                  const isNew = transaction.isNew;
                  const isEditing = !isNew && editingTransaction === transaction.id;
                  
                  if (isNew) {
                    return (
                      <Select
                        data={transactionTypeOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                        value={newTransaction?.type}
                        onChange={(value) => {
                          if (value && newTransaction) {
                            setNewTransaction({ ...newTransaction, type: value as any });
                          }
                        }}
                        size="xs"
                        placeholder="Type"
                      />
                    );
                  }
                  
                  if (isEditing) {
                    return (
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
                    );
                  }
                  
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
                },
              },
              {
                accessor: 'name',
                title: 'Nom',
                sortable: false,
                render: (transaction: any) => {
                  const isNew = transaction.isNew;
                  const isEditing = !isNew && editingTransaction === transaction.id;
                  
                  if (isNew) {
                    return (
                      <SuggestionAutocomplete
                        value={newTransaction?.name || ''}
                        onChange={(value) => {
                          if (newTransaction) {
                            setNewTransaction({ ...newTransaction, name: value });
                          }
                        }}
                        suggestions={nameSuggestions}
                        onAddSuggestion={handleAddNameSuggestion}
                        onDeleteSuggestion={handleDeleteNameSuggestion}
                        placeholder="Nom"
                        size="xs"
                      />
                    );
                  }
                  
                  if (isEditing) {
                    return (
                      <SuggestionAutocomplete
                        value={editingTransactionData?.name || transaction.name}
                        onChange={(value) => {
                          if (editingTransactionData) {
                            setEditingTransactionData({ ...editingTransactionData, name: value });
                          }
                        }}
                        suggestions={nameSuggestions}
                        onAddSuggestion={handleAddNameSuggestion}
                        onDeleteSuggestion={handleDeleteNameSuggestion}
                        size="xs"
                      />
                    );
                  }
                  
                  return <Text size="sm">{transaction.name}</Text>;
                },
              },
              {
                accessor: 'description',
                title: 'Description',
                sortable: false,
                render: (transaction: any) => {
                  const isNew = transaction.isNew;
                  const isEditing = !isNew && editingTransaction === transaction.id;
                  
                  if (isNew) {
                    return (
                      <SuggestionAutocomplete
                        value={newTransaction?.description || ''}
                        onChange={(value) => {
                          if (newTransaction) {
                            setNewTransaction({ ...newTransaction, description: value || undefined });
                          }
                        }}
                        suggestions={descriptionSuggestions}
                        onAddSuggestion={handleAddDescriptionSuggestion}
                        onDeleteSuggestion={handleDeleteDescriptionSuggestion}
                        placeholder="Description"
                        size="xs"
                      />
                    );
                  }
                  
                  if (isEditing) {
                    return (
                      <SuggestionAutocomplete
                        value={editingTransactionData?.description || transaction.description || ''}
                        onChange={(value) => {
                          if (editingTransactionData) {
                            setEditingTransactionData({ ...editingTransactionData, description: value || undefined });
                          }
                        }}
                        suggestions={descriptionSuggestions}
                        onAddSuggestion={handleAddDescriptionSuggestion}
                        onDeleteSuggestion={handleDeleteDescriptionSuggestion}
                        size="xs"
                      />
                    );
                  }
                  
                  return <Text size="sm">{transaction.description || '-'}</Text>;
                },
              },
              {
                accessor: 'amount',
                title: 'Montant',
                textAlign: 'right',
                sortable: false,
                render: (transaction: any) => {
                  const isNew = transaction.isNew;
                  const isEditing = !isNew && editingTransaction === transaction.id;
                  
                  if (isNew) {
                    return (
                      <NumberInput
                        value={newTransaction?.amount ? Number(newTransaction.amount) : undefined}
                        onChange={(value) => {
                          if (newTransaction) {
                            setNewTransaction({
                              ...newTransaction,
                              amount: value ? Number(value) : undefined,
                            });
                          }
                        }}
                        size="xs"
                        min={0}
                        decimalScale={2}
                        placeholder="0.00"
                        style={{ width: '100%' }}
                      />
                    );
                  }
                  
                  if (isEditing) {
                    return (
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
                    );
                  }
                  
                  return (
                    <Text 
                      size="sm" 
                      fw={600}
                      c={transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN' ? 'green' : 'red'}
                    >
                      {(transaction.type === 'DEPOSIT' || transaction.type === 'TRANSFER_IN' ? '+' : '-') + Number(transaction.amount).toFixed(2)} $
                    </Text>
                  );
                },
              },
              {
                accessor: 'actions',
                title: 'Actions',
                textAlign: 'center',
                sortable: false,
                render: (transaction: any) => {
                  const isNew = transaction.isNew;
                  const isEditing = !isNew && editingTransaction === transaction.id;
                  
                  if (isNew) {
                    return (
                      <Group gap="xs" justify="center" wrap="nowrap">
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="green"
                          onClick={() => {
                            if (newTransaction) {
                              handleSaveTransaction(newTransaction);
                            }
                          }}
                          disabled={!newTransaction?.date || !newTransaction?.type || !newTransaction?.name || !newTransaction?.amount}
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
                    );
                  }
                  
                  if (isEditing) {
                    return (
                      <Group gap="xs" justify="center" wrap="nowrap">
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
                      </Group>
                    );
                  }
                  
                  // Calculate if transaction can be moved up or down
                  const transactionDate = new Date(transaction.date);
                  transactionDate.setHours(0, 0, 0, 0);
                  
                  const sameDateTransactions = week.transactions.filter((t) => {
                    const tDate = new Date(t.date);
                    tDate.setHours(0, 0, 0, 0);
                    return tDate.getTime() === transactionDate.getTime();
                  });
                  
                  const sortedSameDate = [...sameDateTransactions].sort((a, b) => a.order - b.order);
                  const currentIndex = sortedSameDate.findIndex((t) => t.id === transaction.id);
                  
                  const canMoveUpInOrder = currentIndex > 0;
                  const canMoveDownInOrder = currentIndex < sortedSameDate.length - 1;
                  
                  const canMoveUp = sortOrder === 'desc' ? canMoveDownInOrder : canMoveUpInOrder;
                  const canMoveDown = sortOrder === 'desc' ? canMoveUpInOrder : canMoveDownInOrder;
                  
                  return (
                    <Group gap="xs" justify="center" wrap="nowrap">
                      {sameDateTransactions.length >= 2 && (
                        <>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            color="gray"
                            onClick={() => handleReorderTransaction(transaction.id, 'up')}
                            disabled={!canMoveUp || loading || isEditing}
                            title={sortOrder === 'desc' ? 'Descendre' : 'Monter'}
                          >
                            <IconArrowUp size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            size="sm"
                            color="gray"
                            onClick={() => handleReorderTransaction(transaction.id, 'down')}
                            disabled={!canMoveDown || loading || isEditing}
                            title={sortOrder === 'desc' ? 'Monter' : 'Descendre'}
                          >
                            <IconArrowDown size={16} />
                          </ActionIcon>
                        </>
                      )}
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
                    </Group>
                  );
                },
              },
            ]}
            striped
            highlightOnHover
            fetching={loading}
            noRecordsText={
              typeFilter.length > 0
                ? 'Aucune transaction trouvée avec ces filtres'
                : 'Aucune transaction trouvée'
            }
            sortStatus={{
              columnAccessor: 'date',
              direction: sortOrder,
            }}
            onSortStatusChange={(status) => {
              // Use our own sorting logic
              if (status) {
                setSortOrder(status.direction === 'asc' ? 'asc' : 'desc');
              }
            }}
          />
        </Paper>
      </DatesProvider>
      </Stack>
    </Container>
  );
}

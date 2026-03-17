'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Container,
  Title,
  Paper,
  Table,
  Group,
  Text,
  Badge,
  Stack,
  Button,
  TextInput,
  ActionIcon,
  Tooltip,
  Select,
  Popover,
} from '@mantine/core';
import { IconEdit, IconCheck, IconX, IconClipboardCheck, IconTools, IconArrowsExchange, IconScale } from '@tabler/icons-react';
import { getItemsWithStock, updateStock, craftItem } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import CraftModal from './modals/CraftModal';
import TransferModal from './modals/TransferModal';
import type { ItemWithRelations, CategoryWithItems } from '@/types/stock';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import type { ChestWithStockHistory } from '@/types/chests';
import { authClient } from '@/lib/client';

interface StockPageClientProps {
  initialItems: ItemWithRelations[];
  initialChests: ChestWithStockHistory[];
}

export default function StockPageClient({ initialItems, initialChests }: StockPageClientProps) {
  const { permissions } = usePermissions();
  const [items, setItems] = useState<ItemWithRelations[]>(initialItems);
  const [chests] = useState<ChestWithStockHistory[]>(initialChests);
  const [selectedChestId, setSelectedChestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [stockValues, setStockValues] = useState<Record<string, number | ''>>({});
  const [saving, setSaving] = useState(false);
  const [craftModalOpened, setCraftModalOpened] = useState(false);
  const [transferModalOpened, setTransferModalOpened] = useState(false);

  // State to store raw input values (with expressions)
  const [stockInputValues, setStockInputValues] = useState<Record<string, string>>({});

  // State for weight calculation popover
  const [weightPopoverOpened, setWeightPopoverOpened] = useState<Record<string, boolean>>({});
  const [weightInputValues, setWeightInputValues] = useState<Record<string, string>>({});
  const [initialStockValues, setInitialStockValues] = useState<Record<string, { input: string; value: number | '' }>>({});

  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await getItemsWithStock(selectedChestId);
      const data = handleAction(result);
      if (data) {
        setItems(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des objets',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChestId]);

  useEffect(() => {
    if (isEditing && items.length > 0) {
      const initialValues: Record<string, number | ''> = {};
      items.forEach((item) => {
        initialValues[item.id] = item.stockToday !== null ? item.stockToday : '';
      });
      setStockValues(initialValues);
    }
  }, [isEditing, items]);

  const handleSaveStock = async () => {
    try {
      setSaving(true);

      // If no chest is selected, use "foure tout" chest by default
      // This ensures we always modify a specific chest
      const targetChestId = selectedChestId || null;

      const stockData = Object.entries(stockValues)
        .filter(([_, value]) => value !== '' && value !== null)
        .map(([itemId, quantity]) => ({
          itemId,
          quantity: typeof quantity === 'number' ? quantity : 0,
        }));

      if (stockData.length === 0) {
        notifications.show({
          title: 'Avertissement',
          message: 'Aucun stock à sauvegarder',
          color: 'yellow',
        });
        return;
      }

      const result = await updateStock(stockData, targetChestId);
      handleAction(result);

      const chestName = targetChestId
        ? chests.find(c => c.id === targetChestId)?.name || 'le coffre sélectionné'
        : 'Foure tout';

      notifications.show({
        title: 'Succès',
        message: `Stock mis à jour avec succès pour ${chestName}`,
        color: 'green',
      });

      setIsEditing(false);
      setStockValues({});
      await loadItems();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la sauvegarde du stock',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setStockValues({});
  };

  const truncateToDecimals = (value: number, decimals: number): number => {
    const factor = 10 ** decimals;
    return Math.trunc(value * factor) / factor;
  };

  const formatTruncated = (value: number, minDecimals = 1, maxDecimals = 2): string => {
    const truncated = truncateToDecimals(value, maxDecimals);
    const [intPart, rawFrac = ''] = String(truncated).split('.');
    const frac = rawFrac.slice(0, maxDecimals);

    if (maxDecimals <= 0) return intPart;

    const padded = frac.padEnd(minDecimals, '0');
    const trimmed = padded.length > minDecimals ? padded.replace(/0+$/, '') : padded;
    return `${intPart}.${trimmed}`;
  };

  // Function to safely evaluate a simple mathematical expression (integer result)
  const evaluateIntegerExpression = (expression: string): number | '' => {
    if (!expression || expression.trim() === '') return '';

    // Clean expression: remove spaces
    const cleaned = expression.replace(/\s/g, '');

    // Check that expression contains only allowed characters
    // Allow digits, +, -, *, /, (, ), and decimal point
    if (!/^[\d+\-*/().]+$/.test(cleaned)) {
      return '';
    }

    try {
      // Use Function constructor to evaluate more safely than eval()
      // Limited to basic mathematical calculations
      const result = new Function('return ' + cleaned)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.round(result);
      }
      return '';
    } catch {
      return '';
    }
  };

  // Function to safely evaluate a simple mathematical expression (decimal result, no rounding)
  const evaluateDecimalExpression = (expression: string): number | '' => {
    if (!expression || expression.trim() === '') return '';

    // Clean expression: remove spaces
    const cleaned = expression.replace(/\s/g, '');

    // Check that expression contains only allowed characters
    // Allow digits, +, -, *, /, (, ), and decimal point
    if (!/^[\d+\-*/().]+$/.test(cleaned)) {
      return '';
    }

    try {
      // Use Function constructor to evaluate more safely than eval()
      // Limited to basic mathematical calculations
      const result = new Function('return ' + cleaned)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return result;
      }
      return '';
    } catch {
      return '';
    }
  };

  const handleStockInputChange = (itemId: string, value: string) => {
    setStockInputValues((prev) => ({
      ...prev,
      [itemId]: value,
    }));

    const trimmed = value.trim();
    if (trimmed === '') {
      setStockValues((prev) => ({
        ...prev,
        [itemId]: '',
      }));
    } else if (/[\+\-\*\/]/.test(trimmed)) {
      // Contains mathematical operators, evaluate expression
      const result = evaluateIntegerExpression(trimmed);
      setStockValues((prev) => ({
        ...prev,
        [itemId]: result,
      }));
    } else {
      const parsed = Number(trimmed);
      const numValue = isNaN(parsed) ? '' : parsed;
      setStockValues((prev) => ({
        ...prev,
        [itemId]: numValue,
      }));
    }
  };

  const handleWeightInputChange = (itemId: string, value: string, item: ItemWithRelations) => {
    setWeightInputValues((prev) => ({
      ...prev,
      [itemId]: value,
    }));

    const trimmed = value.trim();

    // Si l'input est vide, restaurer la valeur initiale
    if (trimmed === '') {
      const initial = initialStockValues[itemId];
      if (initial) {
        setStockInputValues((prev) => ({
          ...prev,
          [itemId]: initial.input,
        }));
        setStockValues((prev) => ({
          ...prev,
          [itemId]: initial.value,
        }));
      }
      return;
    }

    if (!item.weight || item.weight <= 0) {
      return;
    }

    let weightInKg: number;

    if (/[\+\-\*\/]/.test(trimmed)) {
      const result = evaluateDecimalExpression(trimmed);
      if (result === '') {
        return;
      }
      weightInKg = result;
    } else {
      const parsed = Number(trimmed);
      if (isNaN(parsed) || parsed <= 0) {
        return;
      }
      weightInKg = parsed;
    }

    const numberOfItems = Math.round(weightInKg / item.weight);

    setStockInputValues((prev) => ({
      ...prev,
      [itemId]: String(numberOfItems),
    }));

    setStockValues((prev) => ({
      ...prev,
      [itemId]: numberOfItems,
    }));
  };

  const handleWeightCalculation = (item: ItemWithRelations) => {
    const weightInput = weightInputValues[item.id] || '';
    const trimmed = weightInput.trim();

    if (trimmed === '' || !item.weight || item.weight <= 0) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez entrer un poids valide',
        color: 'red',
      });
      return;
    }

    let weightInKg: number;

    if (/[\+\-\*\/]/.test(trimmed)) {
      const result = evaluateDecimalExpression(trimmed);
      if (result === '') {
        notifications.show({
          title: 'Erreur',
          message: 'Expression invalide',
          color: 'red',
        });
        return;
      }
      weightInKg = result;
    } else {
      const parsed = Number(trimmed);
      if (isNaN(parsed)) {
        notifications.show({
          title: 'Erreur',
          message: 'Valeur invalide',
          color: 'red',
        });
        return;
      }
      weightInKg = parsed;
    }

    if (weightInKg <= 0) {
      notifications.show({
        title: 'Erreur',
        message: 'Le poids doit être positif',
        color: 'red',
      });
      return;
    }

    setWeightPopoverOpened((prev) => ({
      ...prev,
      [item.id]: false,
    }));
  };

  useEffect(() => {
    if (isEditing && items.length > 0) {
      const initialInputValues: Record<string, string> = {};
      items.forEach((item) => {
        initialInputValues[item.id] = item.stockToday !== null ? String(item.stockToday) : '';
      });
      setStockInputValues(initialInputValues);
    }
  }, [isEditing, items]);

  const getLuminance = useCallback((hex: string): number => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const [rs, gs, bs] = [r, g, b].map((val) => {
      return val <= 0.03928
        ? val / 12.92
        : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }, []);

  const getTextColor = useCallback((backgroundColor: string): string => {
    const luminance = getLuminance(backgroundColor);
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }, [getLuminance]);

  const itemsByCategory = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!item.category) return acc;

      const categoryId = item.category.id;
      if (!acc[categoryId]) {
        acc[categoryId] = {
          category: item.category,
          items: [],
        };
      }
      acc[categoryId].items.push(item);
      return acc;
    }, {} as Record<string, CategoryWithItems>);
  }, [items]);

  const sortedCategories = useMemo(() => {
    const categories = Object.values(itemsByCategory).sort((a, b) => {
      if (a.category.order !== undefined && b.category.order !== undefined) {
        return a.category.order - b.category.order;
      }
      if (a.category.order !== undefined) return -1;
      if (b.category.order !== undefined) return 1;
      return a.category.name.localeCompare(b.category.name, 'fr', { sensitivity: 'base' });
    });

    categories.forEach((cat) => {
      cat.items.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
      });
    });

    return categories;
  }, [itemsByCategory]);

  const { itemsWithStockToday, totalItems, totalWeightToday } = useMemo(() => {
    const withStock = items.filter((item) => item.stockToday !== null).length;

    const totalWeight = items.reduce((sum, item) => {
      if (item.stockToday === null || item.weight == null) {
        return sum;
      }
      return sum + item.stockToday * item.weight;
    }, 0);

    return {
      itemsWithStockToday: withStock,
      totalItems: items.length,
      totalWeightToday: totalWeight,
    };
  }, [items]);

  const chestOptions = useMemo(() => [
    { value: '', label: 'Tous les coffres' },
    ...chests.map((chest) => ({
      value: chest.id,
      label: chest.name,
    })),
  ], [chests]);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Stock</Title>
        <Group>
          {itemsWithStockToday > 0 && (
            <Badge
              color={itemsWithStockToday === totalItems ? 'green' : 'yellow'}
              variant="light"
              size="lg"
            >
              {itemsWithStockToday}/{totalItems} objets stockés aujourd'hui
            </Badge>
          )}
          <Group>
            {!isEditing && (permissions?.stock.craftRead || permissions?.stock.craftWrite) && (
              <Button
                leftSection={<IconTools size={16} />}
                onClick={() => setCraftModalOpened(true)}
                variant="light"
                color="blue"
              >
                Craft
              </Button>
            )}
            {!isEditing && permissions?.stock.update && (
              <Button
                leftSection={<IconArrowsExchange size={16} />}
                onClick={() => setTransferModalOpened(true)}
                variant="light"
                color="violet"
              >
                Transférer
              </Button>
            )}
            {selectedChestId !== null && (
              <>
                {!isEditing ? (
                  permissions?.stock.update && (
                    <Button
                      leftSection={<IconEdit size={16} />}
                      onClick={() => setIsEditing(true)}
                      variant="light"
                    >
                      {itemsWithStockToday > 0 ? 'Mettre à jour le stock' : 'Faire le stock'}
                    </Button>
                  )
                ) : (
                  <>
                    <Button
                      leftSection={<IconX size={16} />}
                      onClick={handleCancelEdit}
                      variant="subtle"
                      color="gray"
                    >
                      Annuler
                    </Button>
                    <Button
                      leftSection={<IconCheck size={16} />}
                      onClick={handleSaveStock}
                      loading={saving}
                      variant="filled"
                      color="green"
                    >
                      Sauvegarder
                    </Button>
                  </>
                )}
              </>
            )}
          </Group>
        </Group>
      </Group>

      <div className='flex justify-start items-center mb-2 gap-4'>
        <Select
          placeholder="Sélectionner un coffre"
          data={chestOptions}
          value={selectedChestId || ''}
          onChange={(value) => setSelectedChestId(value === '' ? null : value)}
          clearable={false}
          disabled={isEditing}
          style={{ minWidth: 200 }}
        />

        {totalWeightToday > 0 && (
          <Badge color="blue" variant="light" size="lg">
            Poids {selectedChestId === null ? 'total' : ''} (aujourd'hui) : {totalWeightToday.toFixed(2)} kg
          </Badge>
        )}
      </div>

      {loading ? (
        <Text>Chargement...</Text>
      ) : sortedCategories.length === 0 ? (
        <Text c="dimmed">Aucun objet trouvé</Text>
      ) : (
        <Stack gap="xl">
          {sortedCategories.map((categoryData) => {
            const textColor = getTextColor(categoryData.category.color);
            const categoryTotalWeight = categoryData.items.reduce((sum, item) => {
              if (item.stockToday === null || item.weight == null) {
                return sum;
              }
              return sum + item.stockToday * item.weight;
            }, 0);

            return (
              <Paper key={categoryData.category.id} shadow="sm" p="md" withBorder>
                <Group mb="md" justify="space-between" align="center">
                  <Group gap="xs" align="center">
                    <Badge
                      style={{
                        backgroundColor: categoryData.category.color,
                        color: textColor,
                      }}
                      variant="filled"
                      size="lg"
                    >
                      {categoryData.category.name}
                    </Badge>
                    <Text c="dimmed" size="sm">
                      {categoryData.items.length} objet(s)
                    </Text>
                  </Group>
                  {categoryTotalWeight > 0 && (
                    <Text size="sm" fw={600} c={categoryData.category.color}>
                      {categoryTotalWeight.toFixed(2)} kg
                    </Text>
                  )}
                </Group>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Nom</Table.Th>
                      <Table.Th>Quantité minimale</Table.Th>
                      <Table.Th>Stock J-1</Table.Th>
                      <Table.Th>Stock aujourd'hui</Table.Th>
                      {isEditing && permissions?.stock.update && <Table.Th>Nouveau stock</Table.Th>}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {categoryData.items.map((item) => {
                      const hasStockToday = item.stockToday !== null;

                      // Determine stock to use for low stock check
                      // Use stockToday if available, otherwise stockYesterday if available
                      const currentStock = item.stockToday !== null
                        ? item.stockToday
                        : (item.stockYesterday !== null ? item.stockYesterday : null);

                      // Check if stock is low ONLY when "All chests" is selected
                      const isStockLow = selectedChestId === null && currentStock !== null && currentStock < item.idealQuantity;

                      let backgroundColor: string | undefined = undefined;
                      if (isStockLow) {
                        // Craftable items OR non-craftable items without company group
                        if (item.isCraftable || (item.companyGroupId === null)) {
                          backgroundColor = '#fff3cd'; // Jaune clair
                        }
                        // Non-craftable items with company group
                        else if (!item.isCraftable && item.companyGroupId !== null) {
                          backgroundColor = '#f8d7da'; // Rouge clair
                        }
                      }

                      return (
                        <Table.Tr
                          key={item.id}
                          style={{
                            backgroundColor,
                          }}
                        >
                          <Table.Td>
                            <Group gap="xs">
                              <Text fw={500}>{item.name}</Text>
                              {hasStockToday && (
                                <Tooltip label="Stock déjà fait aujourd'hui">
                                  <Badge
                                    color="green"
                                    variant="light"
                                    size="sm"
                                    leftSection={<IconClipboardCheck size={12} />}
                                  >
                                    Fait
                                  </Badge>
                                </Tooltip>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td>{item.idealQuantity}</Table.Td>
                          <Table.Td>
                            {item.stockYesterday !== null ? (
                              <Text>{item.stockYesterday}</Text>
                            ) : (
                              <Text c="dimmed">?</Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {item.stockToday !== null ? (
                              <Text fw={hasStockToday ? 600 : undefined}>
                                {item.stockToday}
                              </Text>
                            ) : (
                              <Text c="dimmed">?</Text>
                            )}
                          </Table.Td>
                          {isEditing && permissions?.stock.update && (
                            <Table.Td>
                              <TextInput
                                value={stockInputValues[item.id] ?? (item.stockToday !== null ? String(item.stockToday) : '')}
                                onChange={(e) => handleStockInputChange(item.id, String(e.currentTarget.value))}
                                onBlur={(e) => {
                                  // When leaving field, evaluate expression and update display
                                  const inputValue = e.currentTarget.value.trim();
                                  if (inputValue === '') {
                                    setStockInputValues((prev) => ({
                                      ...prev,
                                      [item.id]: '',
                                    }));
                                  } else if (/[\+\-\*\/]/.test(inputValue)) {
                                    const result = evaluateIntegerExpression(inputValue);
                                    if (result !== '') {
                                      setStockInputValues((prev) => ({
                                        ...prev,
                                        [item.id]: String(result),
                                      }));
                                    }
                                  }
                                }}
                                placeholder="Quantité (ex: 30 + 45)"
                                style={{ maxWidth: 200 }}
                                rightSectionWidth={hasStockToday && item.weight != null && item.weight > 0 ? 60 : undefined}
                                rightSection={
                                  <Group gap={2} wrap="nowrap">
                                    {hasStockToday && (
                                      <Tooltip label="Mise à jour du stock existant">
                                        <ActionIcon size="sm" variant="subtle" color="blue" tabIndex={-1}>
                                          <IconEdit size={14} />
                                        </ActionIcon>
                                      </Tooltip>
                                    )}
                                    {item.weight != null && item.weight > 0 && (
                                      <Popover
                                        position="top"
                                        withArrow
                                        shadow="md"
                                        opened={weightPopoverOpened[item.id] || false}
                                        onChange={(opened) => setWeightPopoverOpened((prev) => ({ ...prev, [item.id]: opened }))}
                                      >
                                        <Popover.Target>
                                          <Tooltip label="Calculer à partir du poids">
                                            <ActionIcon
                                              size="sm"
                                              variant="subtle"
                                              color="blue"
                                              tabIndex={-1}
                                              onClick={() => {
                                                const isOpening = !weightPopoverOpened[item.id];
                                                setWeightPopoverOpened((prev) => ({ ...prev, [item.id]: isOpening }));

                                                if (isOpening) {
                                                  // Sauvegarder la valeur initiale
                                                  setInitialStockValues((prev) => ({
                                                    ...prev,
                                                    [item.id]: {
                                                      input: stockInputValues[item.id] ?? (item.stockToday !== null ? String(item.stockToday) : ''),
                                                      value: stockValues[item.id] ?? (item.stockToday !== null ? item.stockToday : ''),
                                                    },
                                                  }));
                                                }
                                              }}
                                            >
                                              <IconScale size={14} />
                                            </ActionIcon>
                                          </Tooltip>
                                        </Popover.Target>
                                        <Popover.Dropdown>
                                          <Stack gap="xs" p="xs">
                                            <Text size="sm" fw={500}>
                                              Calculer à partir du poids
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                              Poids unitaire: {item.weight} kg
                                            </Text>
                                            <TextInput
                                              value={weightInputValues[item.id] || ''}
                                              onChange={(e) => handleWeightInputChange(item.id, String(e.currentTarget.value), item)}
                                              placeholder="Poids en kg (ex: 2.5 + 1.2)"
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  handleWeightCalculation(item);
                                                }
                                              }}
                                              size="xs"
                                              rightSection={
                                                <Group gap={2} wrap="nowrap" pr={16}>
                                                  <Text size="xs" c="dimmed">KG</Text>
                                                  {weightInputValues[item.id] && /[\+\-\*\/]/.test(weightInputValues[item.id]) ? (
                                                    <ActionIcon
                                                      size="xs"
                                                      variant="subtle"
                                                      color="blue"
                                                      onClick={() => {
                                                        const inputValue = weightInputValues[item.id] || '';
                                                        const trimmed = inputValue.trim();
                                                        if (trimmed && /[\+\-\*\/]/.test(trimmed)) {
                                                          const result = evaluateDecimalExpression(trimmed);
                                                          if (result !== '') {
                                                            setWeightInputValues((prev) => ({
                                                              ...prev,
                                                              [item.id]: String(result),
                                                            }));
                                                          }
                                                        }
                                                      }}
                                                    >
                                                      <IconCheck size={12} />
                                                    </ActionIcon>
                                                  ) : undefined}
                                                </Group>

                                              }
                                            />
                                            <Group gap="xs" justify="flex-end" mt="xs">
                                              <Button
                                                size="xs"
                                                variant="subtle"
                                                onClick={() => {
                                                  // Restaurer la valeur initiale
                                                  const initial = initialStockValues[item.id];
                                                  if (initial) {
                                                    setStockInputValues((prev) => ({
                                                      ...prev,
                                                      [item.id]: initial.input,
                                                    }));
                                                    setStockValues((prev) => ({
                                                      ...prev,
                                                      [item.id]: initial.value,
                                                    }));
                                                  }
                                                  setWeightPopoverOpened((prev) => ({ ...prev, [item.id]: false }));
                                                  setWeightInputValues((prev) => ({ ...prev, [item.id]: '' }));
                                                }}
                                              >
                                                Annuler
                                              </Button>
                                              <Button
                                                size="xs"
                                                onClick={() => handleWeightCalculation(item)}
                                              >
                                                Valider
                                              </Button>
                                            </Group>
                                          </Stack>
                                        </Popover.Dropdown>
                                      </Popover>
                                    )}
                                  </Group>
                                }
                              />
                            </Table.Td>
                          )}
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Paper>
            );
          })}
        </Stack>
      )}

      {craftModalOpened && (
        <CraftModal
          opened={craftModalOpened}
          onClose={() => setCraftModalOpened(false)}
          items={items}
          canCraft={permissions?.stock.craftWrite ?? false}
          initialChestId={selectedChestId}
          chests={chests}
          onCraft={async (itemId, recipeId, times, sourceChestId, ingredientChests, destinationChestId) => {
            if (!permissions?.stock.craftWrite) {
              notifications.show({
                title: 'Permission refusée',
                message: 'Vous n\'avez pas la permission d\'effectuer un craft.',
                color: 'red',
              });
              return;
            }
            try {
              const result = await craftItem({
                craftedItemId: itemId,
                recipeId,
                times,
                sourceChestId,
                ingredientChests,
                destinationChestId,
              });

              if (result.status === 200 && 'data' in result && result.data && 'quantityProduced' in result.data) {
                notifications.show({
                  title: 'Succès',
                  message: `Craft effectué avec succès ! ${result.data.quantityProduced} objet(s) produit(s).`,
                  color: 'green',
                });
                setCraftModalOpened(false);
                await loadItems(); // Recharger les items pour mettre à jour les stocks
              } else {
                const errorMessage = 'error' in result
                  ? (typeof result.error === 'string' ? result.error : 'Erreur lors du craft')
                  : 'Erreur lors du craft';
                notifications.show({
                  title: 'Erreur',
                  message: errorMessage,
                  color: 'red',
                });
              }
            } catch (error: any) {
              notifications.show({
                title: 'Erreur',
                message: error.message || 'Erreur lors du craft',
                color: 'red',
              });
            }
          }}
        />
      )}

      {transferModalOpened && (
        <TransferModal
          opened={transferModalOpened}
          onClose={() => setTransferModalOpened(false)}
          items={items}
          chests={chests}
          initialSourceChestId={selectedChestId}
          onTransfer={async () => {
            await loadItems(); // Recharger les items pour mettre à jour les stocks
          }}
        />
      )}
    </Container>
  );
}


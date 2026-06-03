'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Stack,
  Select,
  NumberInput,
  Text,
  Button,
  Group,
  Paper,
  Alert,
  Badge,
  Table,
  ScrollArea,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { transferMultipleStock } from '@/app/_actions/stock';
import { getItemsWithStock } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import type { ItemWithRelations } from '@/types/stock';
import type { ChestWithStockHistory } from '@/types/chests';

interface TransferModalProps {
  opened: boolean;
  onClose: () => void;
  items: ItemWithRelations[];
  chests: ChestWithStockHistory[];
  initialSourceChestId?: string | null; // Pre-selected source chest from stock view
  onTransfer: () => void; // Callback after successful transfer
}

export default function TransferModal({
  opened,
  onClose,
  items,
  chests,
  initialSourceChestId = null,
  onTransfer,
}: TransferModalProps) {
  const { dispensarySlug } = usePermissions();
  const [sourceChestId, setSourceChestId] = useState<string | null>(initialSourceChestId);
  const [destinationChestId, setDestinationChestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [itemsWithStock, setItemsWithStock] = useState<ItemWithRelations[]>(items);
  const [loadingItems, setLoadingItems] = useState(false);
  const [quantitiesByItem, setQuantitiesByItem] = useState<Record<string, number | ''>>({});

  // Update sourceChestId when initialSourceChestId changes
  useEffect(() => {
    if (opened && initialSourceChestId !== null) {
      setSourceChestId(initialSourceChestId);
    } else if (opened && initialSourceChestId === null) {
      setSourceChestId(null);
    }
  }, [opened, initialSourceChestId]);

  // Load items with stock from selected source chest
  useEffect(() => {
    if (opened && sourceChestId) {
      const loadItemsForChest = async () => {
        setLoadingItems(true);
        try {
          const result = await getItemsWithStock(dispensarySlug!, sourceChestId);
          const data = handleAction(result);
          if (data) {
            setItemsWithStock(data);
            // Reset quantities when source chest changes
            const initialQuantities: Record<string, number | ''> = {};
            data
              .filter((item: ItemWithRelations) => item.stockToday !== null && item.stockToday > 0)
              .forEach((item: ItemWithRelations) => {
                initialQuantities[item.id] = '';
              });
            setQuantitiesByItem(initialQuantities);
          }
        } catch (error: any) {
          notifications.show({
            title: 'Erreur',
            message: error.message || 'Erreur lors du chargement des stocks',
            color: 'red',
          });
        } finally {
          setLoadingItems(false);
        }
      };
      loadItemsForChest();
    } else if (opened && !sourceChestId) {
      // If no source chest is selected, reset items and quantities
      setItemsWithStock([]);
      setQuantitiesByItem({});
    }
  }, [opened, sourceChestId]);

  // Reset states when modal closes
  useEffect(() => {
    if (!opened) {
      setDestinationChestId(null);
      setQuantitiesByItem({});
    }
  }, [opened]);

  // Filter chests to exclude source chest from destination list
  const availableDestinationChests = chests.filter((chest) => chest.id !== sourceChestId);

  // Items eligible for transfer (with available stock), sorted by category then by item order
  const transferableItems = useMemo(() => {
    const filtered = itemsWithStock.filter(
      (item) => item.stockToday !== null && item.stockToday > 0
    );
    
    return filtered.sort((a, b) => {
      // Sort by category order
      const categoryOrderA = a.category?.order ?? 0;
      const categoryOrderB = b.category?.order ?? 0;
      if (categoryOrderA !== categoryOrderB) {
        return categoryOrderA - categoryOrderB;
      }
      
      // If same category order, sort by item order
      const itemOrderA = a.order ?? 0;
      const itemOrderB = b.order ?? 0;
      if (itemOrderA !== itemOrderB) {
        return itemOrderA - itemOrderB;
      }
      
      // If same order, alphabetical sort by name
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });
  }, [itemsWithStock]);

  // Options for chests
  const sourceChestOptions = chests.map((chest) => ({
    value: chest.id,
    label: chest.name,
  }));

  const destinationChestOptions = availableDestinationChests.map((chest) => ({
    value: chest.id,
    label: chest.name,
  }));

  // Build transfer list from entered quantities
  const transferItems = transferableItems
    .map((item) => {
      const quantity = quantitiesByItem[item.id];
      return {
        item,
        quantity,
      };
    })
    .filter(({ quantity }) => typeof quantity === 'number' && quantity > 0);

  const hasInvalidQuantity = transferableItems.some((item) => {
    const quantity = quantitiesByItem[item.id];
    if (quantity === '' || quantity === undefined) return false;
    if (typeof quantity !== 'number') return true;
    if (quantity <= 0) return true;
    if (item.stockToday === null) return true;
    return quantity > item.stockToday;
  });

  const handleTransfer = async () => {
    if (!sourceChestId || !destinationChestId) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez sélectionner un coffre source et un coffre destination',
        color: 'red',
      });
      return;
    }

    if (transferItems.length === 0) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez saisir au moins une quantité à transférer',
        color: 'red',
      });
      return;
    }

    if (hasInvalidQuantity) {
      notifications.show({
        title: 'Erreur',
        message: 'Certaines quantités saisies ne sont pas valides ou dépassent le stock disponible',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);
      const result = await transferMultipleStock(dispensarySlug!, {
        sourceChestId,
        destinationChestId,
        items: transferItems.map(({ item, quantity }) => ({
          itemId: item.id,
          quantity: typeof quantity === 'number' ? quantity : 0,
        })),
      });

      handleAction(result);

      const sourceChestName = chests.find((c) => c.id === sourceChestId)?.name || 'le coffre source';
      const destinationChestName = chests.find((c) => c.id === destinationChestId)?.name || 'le coffre destination';
      const totalQuantity = transferItems.reduce(
        (sum, { quantity }) => (typeof quantity === 'number' ? sum + quantity : sum),
        0
      );

      notifications.show({
        title: 'Succès',
        message: `${totalQuantity} objet(s) transféré(s) de ${sourceChestName} vers ${destinationChestName}`,
        color: 'green',
      });

      onTransfer();
      onClose();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du transfert',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const canTransfer =
    sourceChestId !== null &&
    destinationChestId !== null &&
    transferItems.length > 0 &&
    !hasInvalidQuantity;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Transférer des items entre coffres"
      size="lg"
      yOffset={60}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Information"
          color="blue"
        >
          Transférez des items d'un coffre source vers un coffre destination. Le stock sera automatiquement mis à jour dans les deux coffres.
        </Alert>

        <Group grow align="flex-end">
          <Select
            label="Coffre source"
            placeholder="Sélectionner le coffre source"
            data={sourceChestOptions}
            value={sourceChestId}
            onChange={(value) => setSourceChestId(value)}
            required
            clearable={false}
          />

          <Select
            label="Coffre destination"
            placeholder="Sélectionner le coffre destination"
            data={destinationChestOptions}
            value={destinationChestId}
            onChange={(value) => setDestinationChestId(value)}
            required
            clearable={false}
            disabled={!sourceChestId}
          />
        </Group>

        {sourceChestId && (
          <>
            {transferableItems.length === 0 ? (
              <Text c="dimmed" size="sm">
                Aucun item avec du stock disponible dans ce coffre.
              </Text>
            ) : (
              <Paper withBorder shadow="xs" p="sm">
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    Items transférables depuis ce coffre
                  </Text>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Item</Table.Th>
                        <Table.Th style={{ width: 140 }}>Stock disponible</Table.Th>
                        <Table.Th style={{ width: 180 }}>Quantité à transférer</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {transferableItems.map((item) => {
                        const availableStock = item.stockToday ?? 0;
                        const quantity = quantitiesByItem[item.id] ?? '';
                        const isQuantityInvalid =
                          quantity !== '' &&
                          (typeof quantity !== 'number' ||
                            quantity <= 0 ||
                            quantity > availableStock);

                        return (
                          <Table.Tr key={item.id}>
                            <Table.Td>
                              <Text fw={500}>{item.name}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge color="blue" variant="light">
                                {availableStock}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <NumberInput
                                value={quantity}
                                onChange={(value) =>
                                  setQuantitiesByItem((prev) => ({
                                    ...prev,
                                    [item.id]: typeof value === 'number' ? value : '',
                                  }))
                                }
                                min={0}
                                max={availableStock}
                                placeholder="0"
                                error={isQuantityInvalid}
                              />
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      {transferItems.length} item(s) sélectionné(s) pour le transfert
                    </Text>
                    {hasInvalidQuantity && (
                      <Text size="sm" c="red">
                        Certaines quantités sont invalides ou dépassent le stock disponible
                      </Text>
                    )}
                  </Group>
                </Stack>
              </Paper>
            )}
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleTransfer}
            loading={loading}
            disabled={!canTransfer}
            color="blue"
          >
            Transférer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

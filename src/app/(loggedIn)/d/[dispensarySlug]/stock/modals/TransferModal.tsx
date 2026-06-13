'use client';

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
import type { ChestListItem } from '@/types/chests';
import { sortItems } from '@/lib/stock/sortItemsByCategory';
import { useStockItems, useTransferMutation } from '../hooks/useStockQueries';
import { notifications } from '@mantine/notifications';

interface TransferModalProps {
  opened: boolean;
  onClose: () => void;
  chests: ChestListItem[];
  initialSourceChestId?: string | null;
}

export default function TransferModal({
  opened,
  onClose,
  chests,
  initialSourceChestId = null,
}: TransferModalProps) {
  const [sourceChestId, setSourceChestId] = useState<string | null>(initialSourceChestId);
  const [destinationChestId, setDestinationChestId] = useState<string | null>(null);
  const [quantitiesByItem, setQuantitiesByItem] = useState<Record<string, number | ''>>({});

  const { data: itemsWithStock = [], isFetching: loadingItems } = useStockItems(sourceChestId, []);
  const transferMutation = useTransferMutation();

  useEffect(() => {
    if (opened && initialSourceChestId !== null) {
      setSourceChestId(initialSourceChestId);
    } else if (opened && initialSourceChestId === null) {
      setSourceChestId(null);
    }
  }, [opened, initialSourceChestId]);

  useEffect(() => {
    if (!opened) {
      setDestinationChestId(null);
      setQuantitiesByItem({});
    }
  }, [opened]);

  useEffect(() => {
    if (sourceChestId) {
      const initialQuantities: Record<string, number | ''> = {};
      itemsWithStock
        .filter((item) => item.stockToday !== null && item.stockToday > 0)
        .forEach((item) => {
          initialQuantities[item.id] = '';
        });
      setQuantitiesByItem(initialQuantities);
    } else {
      setQuantitiesByItem({});
    }
  }, [sourceChestId, itemsWithStock]);

  const availableDestinationChests = chests.filter((chest) => chest.id !== sourceChestId);

  const transferableItems = useMemo(() => {
    const filtered = itemsWithStock.filter(
      (item) => item.stockToday !== null && item.stockToday > 0,
    );
    return sortItems(filtered);
  }, [itemsWithStock]);

  const sourceChestOptions = chests.map((chest) => ({
    value: chest.id,
    label: chest.name,
  }));

  const destinationChestOptions = availableDestinationChests.map((chest) => ({
    value: chest.id,
    label: chest.name,
  }));

  const transferItems = transferableItems
    .map((item) => {
      const quantity = quantitiesByItem[item.id];
      return { item, quantity };
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
        color: 'danger',
      });
      return;
    }

    if (transferItems.length === 0) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez saisir au moins une quantité à transférer',
        color: 'danger',
      });
      return;
    }

    if (hasInvalidQuantity) {
      notifications.show({
        title: 'Erreur',
        message: 'Certaines quantités saisies ne sont pas valides ou dépassent le stock disponible',
        color: 'danger',
      });
      return;
    }

    try {
      await transferMutation.mutateAsync({
        sourceChestId,
        destinationChestId,
        items: transferItems.map(({ item, quantity }) => ({
          itemId: item.id,
          quantity: typeof quantity === 'number' ? quantity : 0,
        })),
      });
      onClose();
    } catch {
      // Notification handled in mutation hook
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
          color="denim"
          variant="light"
        >
          Transférez des items d&apos;un coffre source vers un coffre destination. Le stock sera automatiquement mis à jour dans les deux coffres.
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

        {sourceChestId && loadingItems && (
          <Text c="dimmed" size="sm">
            Chargement des stocks...
          </Text>
        )}

        {sourceChestId && !loadingItems && (
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
                              <Badge color="denim" variant="light">
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
                      <Text size="sm" c="danger">
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
          <Button variant="subtle" onClick={onClose} color="slate">
            Annuler
          </Button>
          <Button
            onClick={handleTransfer}
            loading={transferMutation.isPending}
            disabled={!canTransfer}
            color="sage"
          >
            Transférer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

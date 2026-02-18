'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  MultiSelect,
  Stack,
  Group,
  Text,
  Table,
  Badge,
  LoadingOverlay,
} from '@mantine/core';
import { getItemsWithDetailedStock } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import type { ChestWithStockHistory } from '@/types/chests';

interface Item {
  id: string;
  name: string;
  description: string | null;
  idealQuantity: number;
  isCraftable: boolean;
  canBeSold: boolean;
  price: number | null;
  category: {
    id: string;
    name: string;
    color: string;
    order: number;
  } | null;
  companyGroup: {
    id: string;
    name: string;
  } | null;
}

interface ItemWithDetailedStock {
  id: string;
  name: string;
  description: string | null;
  idealQuantity: number;
  isCraftable: boolean;
  canBeSold: boolean;
  price: number | null;
  category: {
    id: string;
    name: string;
    color: string;
  } | null;
  companyGroup: {
    id: string;
    name: string;
  } | null;
  totalStockToday: number | null;
  totalStockYesterday: number | null;
  stockByChest: {
    chestId: string;
    chestName: string;
    stockToday: number | null;
    stockYesterday: number | null;
  }[];
}

interface SearchItemsPageClientProps {
  initialItems: Item[];
  initialChests: ChestWithStockHistory[];
}

export default function SearchItemsPageClient({
  initialItems,
  initialChests,
}: SearchItemsPageClientProps) {
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemsWithStock, setItemsWithStock] = useState<ItemWithDetailedStock[]>([]);
  const [loading, setLoading] = useState(false);

  const itemOptions = initialItems.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const loadItemsDetails = async () => {
    if (selectedItemIds.length === 0) {
      setItemsWithStock([]);
      return;
    }

    try {
      setLoading(true);
      const result = await getItemsWithDetailedStock(selectedItemIds);
      const data = handleAction(result);
      if (data) {
        setItemsWithStock(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des détails des items',
        color: 'red',
      });
      setItemsWithStock([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItemsDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemIds]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Title order={1}>Recherche d'items</Title>

        <Paper shadow="sm" p="md" withBorder>
          <Stack gap="md">
            <MultiSelect
              label="Sélectionner des items"
              placeholder="Rechercher et sélectionner des items"
              data={itemOptions}
              value={selectedItemIds}
              onChange={setSelectedItemIds}
              searchable
              clearable
              maxDropdownHeight={300}
            />

            {itemsWithStock.length > 0 && (
              <Stack gap="lg" mt="md">
                {itemsWithStock.map((item) => (
                  <Paper key={item.id} shadow="xs" p="md" withBorder pos="relative">
                    <LoadingOverlay visible={loading} />
                    <Stack gap="sm">
                      <Group justify="space-between" align="flex-start">
                        <Stack gap="xs">
                          <Group gap="xs">
                            <Text fw={600} size="lg">
                              {item.name}
                            </Text>
                            {item.category && (
                              <Badge
                                style={{
                                  backgroundColor: item.category.color,
                                  color: '#000',
                                }}
                                variant="filled"
                              >
                                {item.category.name}
                              </Badge>
                            )}
                            {item.isCraftable && (
                              <Badge color="blue" variant="light">
                                Craftable
                              </Badge>
                            )}
                            {item.canBeSold && (
                              <Badge color="green" variant="light">
                                Vendu
                              </Badge>
                            )}
                          </Group>
                          {item.description && (
                            <Text size="sm" c="dimmed">
                              {item.description}
                            </Text>
                          )}
                          {item.companyGroup && (
                            <Text size="sm" c="dimmed">
                              Groupe d'entreprise : {item.companyGroup.name}
                            </Text>
                          )}
                          <Group gap="md">
                            <Text size="sm">
                              <Text span fw={500}>
                                Quantité idéale :
                              </Text>{' '}
                              {item.idealQuantity}
                            </Text>
                            {item.price !== null && (
                              <Text size="sm">
                                <Text span fw={500}>
                                  Prix :
                                </Text>{' '}
                                {item.price.toFixed(2)} €
                              </Text>
                            )}
                          </Group>
                        </Stack>
                        <Stack gap="xs" align="flex-end">
                          <Group gap="md">
                            <Stack gap={2} align="flex-end">
                              <Text size="xs" c="dimmed">
                                Stock total aujourd'hui
                              </Text>
                              <Text size="xl" fw={700} c={item.totalStockToday !== null ? 'blue' : 'dimmed'}>
                                {item.totalStockToday !== null ? item.totalStockToday : '?'}
                              </Text>
                            </Stack>
                            <Stack gap={2} align="flex-end">
                              <Text size="xs" c="dimmed">
                                Stock total hier
                              </Text>
                              <Text size="lg" fw={500} c={item.totalStockYesterday !== null ? 'dimmed' : 'dimmed'}>
                                {item.totalStockYesterday !== null ? item.totalStockYesterday : '?'}
                              </Text>
                            </Stack>
                          </Group>
                        </Stack>
                      </Group>

                      <Table striped highlightOnHover mt="md">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Coffre</Table.Th>
                            <Table.Th>Stock aujourd'hui</Table.Th>
                            <Table.Th>Stock hier</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {item.stockByChest.map((chestStock) => (
                            <Table.Tr key={chestStock.chestId}>
                              <Table.Td>
                                <Text fw={500}>{chestStock.chestName}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Text c={chestStock.stockToday !== null ? 'blue' : 'dimmed'}>
                                  {chestStock.stockToday !== null ? chestStock.stockToday : '?'}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Text c="dimmed">
                                  {chestStock.stockYesterday !== null ? chestStock.stockYesterday : '?'}
                                </Text>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            {selectedItemIds.length > 0 && itemsWithStock.length === 0 && !loading && (
              <Text c="dimmed" ta="center" py="xl">
                Aucune information de stock disponible pour les items sélectionnés
              </Text>
            )}

            {selectedItemIds.length === 0 && (
              <Text c="dimmed" ta="center" py="xl">
                Sélectionnez des items pour voir leurs informations détaillées
              </Text>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

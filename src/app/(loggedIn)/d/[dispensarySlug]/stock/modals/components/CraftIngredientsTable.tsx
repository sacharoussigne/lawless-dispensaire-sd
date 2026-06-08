'use client';

import { Badge, Button, Paper, Select, Stack, Table, Text } from '@mantine/core';
import { apothecaryBooleanPills, apothecaryPillStyle } from '@/lib/apothecaryPill';
import { denimPalette, amberPalette, dangerPalette } from '@/lib/design-tokens';

type StockInfo = { stock: number | null; isToday: boolean };

export type CraftIngredientRow = {
  id: string;
  usedItemId: string;
  usedItemName: string;
  requiredQuantity: number;
  ingredientChestId: string | null;
  stockInfo: StockInfo;
  hasEnough: boolean;
  isActionableMissing: boolean;
};

export function CraftIngredientsTable(props: {
  title?: string;
  rows: CraftIngredientRow[];
  chestOptions: { value: string; label: string }[];
  disabled: boolean;
  onChangeIngredientChest: (ingredientId: string, chestId: string | null) => void;
  onDrillDown: (ingredientId: string) => void;
}) {
  const { title = 'Ingrédients nécessaires', rows, chestOptions, disabled, onChangeIngredientChest, onDrillDown } = props;

  return (
    <Paper withBorder shadow="xs" p="sm">
      <Stack gap="sm">
        <Text size="xs" c="dimmed" fw={600} tt="uppercase">
          {title}
        </Text>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Ingrédient</Table.Th>
              <Table.Th style={{ width: 180 }}>Coffre source</Table.Th>
              <Table.Th style={{ width: 120 }}>Stock</Table.Th>
              <Table.Th style={{ width: 100 }}>Requis</Table.Th>
              <Table.Th style={{ width: 60 }}>Statut</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => {
              return (
                <Table.Tr key={row.id}>
                  <Table.Td>
                    {row.isActionableMissing ? (
                      <Button
                        variant="subtle"
                        size="xs"
                        fullWidth
                        justify="flex-start"
                        px="xs"
                        py={6}
                        styles={{
                          root: {
                            height: 'auto',
                          },
                          inner: {
                            justifyContent: 'flex-start',
                          },
                          label: {
                            width: '100%',
                            textAlign: 'left',
                            whiteSpace: 'normal',
                          },
                        }}
                        onClick={() => onDrillDown(row.id)}
                      >
                        {row.usedItemName}
                      </Button>
                    ) : (
                      <Text fw={500}>{row.usedItemName}</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Select
                      data={chestOptions}
                      value={row.ingredientChestId}
                      onChange={(value) => onChangeIngredientChest(row.id, value)}
                      size="xs"
                      disabled={disabled}
                    />
                  </Table.Td>
                  <Table.Td>
                    {row.stockInfo.stock !== null ? (
                      <Badge
                        variant="outline"
                        style={apothecaryPillStyle(row.stockInfo.isToday ? denimPalette : amberPalette)}
                      >
                        {row.stockInfo.stock} {row.stockInfo.isToday ? '' : '(hier)'}
                      </Badge>
                    ) : (
                      <Text size="xs" c="red">
                        Aucun stock
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {row.requiredQuantity}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {row.stockInfo.stock !== null ? (
                      row.hasEnough ? (
                        <Badge variant="outline" style={apothecaryBooleanPills.yes} size="sm">
                          ✓
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          style={apothecaryPillStyle(row.stockInfo.isToday ? dangerPalette : amberPalette)}
                          size="sm"
                        >
                          ✗
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" style={apothecaryBooleanPills.noAlert} size="sm">
                        ✗
                      </Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Stack>
    </Paper>
  );
}


'use client';

import { memo } from 'react';
import { Badge, Group, Paper, Table, Text } from '@mantine/core';
import type { CategoryWithItems } from '@/types/stock';
import { StockRow } from './StockRow';
import type { EvalResult } from '@/lib/stock/expression';
import type { StockUiPreferences } from '@/types/stockUiPreferences';

interface CategorySectionProps {
  categoryData: CategoryWithItems;
  editedQuantitiesByItemId: Record<string, number | null | undefined>;
  isEditing: boolean;
  canStockUpdate: boolean;
  selectedChestId: string | null;
  isCategoryCheckEnabled: (categoryId: string) => boolean;
  getTextColor: (backgroundColor: string) => string;
  stockUiPreferences: StockUiPreferences;
  onCommitQuantity: (itemId: string, quantity: number | null) => void;
  evaluateIntegerExpression: (expression: string) => EvalResult;
  evaluateDecimalExpression: (expression: string) => EvalResult;
}

export const CategorySection = memo(function CategorySection({
  categoryData,
  editedQuantitiesByItemId,
  isEditing,
  canStockUpdate,
  selectedChestId,
  isCategoryCheckEnabled,
  getTextColor,
  stockUiPreferences,
  onCommitQuantity,
  evaluateIntegerExpression,
  evaluateDecimalExpression,
}: CategorySectionProps) {
  const textColor = getTextColor(categoryData.category.color);
  const shouldShowMinimalQuantity = !(selectedChestId !== null && !isCategoryCheckEnabled(categoryData.category.id));

  const categoryTotalWeight = categoryData.items.reduce((sum, item) => {
    if (item.stockToday === null || item.weight == null) return sum;
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
          <Text c="dimmed" size="sm" className="disp-inline-meta">
            {categoryData.items.length} objet(s)
          </Text>
        </Group>
        {categoryTotalWeight > 0 && (
          <Text size="sm" fw={600} c={categoryData.category.color} className="disp-inline-meta">
            {categoryTotalWeight.toFixed(2)} kg
          </Text>
        )}
      </Group>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nom</Table.Th>
            <Table.Th>
              {shouldShowMinimalQuantity ? (
                'Quantité minimale'
              ) : (
                <span style={{ visibility: 'hidden' }}>Quantité minimale</span>
              )}
            </Table.Th>
            <Table.Th>Stock J-1</Table.Th>
            <Table.Th>Stock aujourd'hui</Table.Th>
            {isEditing && canStockUpdate && <Table.Th>Nouveau stock</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {categoryData.items.map((item) => (
            <StockRow
              key={item.id}
              item={item}
              editedQuantity={editedQuantitiesByItemId[item.id] ?? item.stockToday}
              isEditing={isEditing}
              canStockUpdate={canStockUpdate}
              isCategoryCheckEnabled={isCategoryCheckEnabled}
              shouldShowMinimalQuantity={shouldShowMinimalQuantity}
              getTextColor={getTextColor}
              stockUiPreferences={stockUiPreferences}
              onCommitQuantity={onCommitQuantity}
              evaluateIntegerExpression={evaluateIntegerExpression}
              evaluateDecimalExpression={evaluateDecimalExpression}
            />
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
});


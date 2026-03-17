'use client';

import { memo } from 'react';
import { Badge, Group, Table, Text, Tooltip } from '@mantine/core';
import { IconClipboardCheck } from '@tabler/icons-react';
import type { ItemWithRelations } from '@/types/stock';
import { EditableStockCell } from './EditableStockCell';
import type { EvalResult } from '@/lib/stock/expression';
import type { StockUiPreferences } from '@/types/stockUiPreferences';

interface StockRowProps {
  item: ItemWithRelations;
  editedQuantity: number | null;
  isEditing: boolean;
  canStockUpdate: boolean;
  isCategoryCheckEnabled: (categoryId: string) => boolean;
  shouldShowMinimalQuantity: boolean;
  getTextColor: (backgroundColor: string) => string;
  stockUiPreferences: StockUiPreferences;
  onCommitQuantity: (itemId: string, quantity: number | null) => void;
  evaluateIntegerExpression: (expression: string) => EvalResult;
  evaluateDecimalExpression: (expression: string) => EvalResult;
}

export const StockRow = memo(function StockRow({
  item,
  editedQuantity,
  isEditing,
  canStockUpdate,
  isCategoryCheckEnabled,
  shouldShowMinimalQuantity,
  getTextColor,
  stockUiPreferences,
  onCommitQuantity,
  evaluateIntegerExpression,
  evaluateDecimalExpression,
}: StockRowProps) {
  const hasStockToday = item.stockToday !== null;

  const currentStock =
    item.stockToday !== null ? item.stockToday : item.stockYesterday !== null ? item.stockYesterday : null;

  const shouldCheck = isCategoryCheckEnabled(item.categoryId);
  const isStockLow = shouldCheck && currentStock !== null && currentStock < item.minimalQuantity;

  let backgroundColor: string | undefined = undefined;
  if (isStockLow) {
    if (item.isCraftable || item.companyGroupId === null) backgroundColor = stockUiPreferences.lowStockCraftableBg;
    else backgroundColor = stockUiPreferences.lowStockNormalBg;
  } else if (currentStock === null) {
    backgroundColor = stockUiPreferences.unknownStockBg ?? undefined;
  } else if (shouldCheck && currentStock >= item.minimalQuantity) {
    backgroundColor = stockUiPreferences.okStockBg ?? undefined;
  }

  const doneTodayBadgeBg = stockUiPreferences.doneTodayBadgeBg;
  const doneTodayTextColor = doneTodayBadgeBg ? getTextColor(doneTodayBadgeBg) : undefined;

  return (
    <Table.Tr key={item.id} style={{ backgroundColor }}>
      <Table.Td>
        <Group gap="xs">
          <Text fw={500}>{item.name}</Text>
          {hasStockToday && (
            <Tooltip label="Stock déjà fait aujourd'hui">
              {doneTodayBadgeBg ? (
                <Badge
                  variant="filled"
                  size="sm"
                  leftSection={<IconClipboardCheck size={12} />}
                  style={{ backgroundColor: doneTodayBadgeBg, color: doneTodayTextColor }}
                >
                  Fait
                </Badge>
              ) : (
                <Badge
                  color="green"
                  variant="light"
                  size="sm"
                  leftSection={<IconClipboardCheck size={12} />}
                >
                  Fait
                </Badge>
              )}
            </Tooltip>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        {shouldShowMinimalQuantity ? (
          item.minimalQuantity
        ) : (
          <span style={{ visibility: 'hidden' }}>{item.minimalQuantity}</span>
        )}
      </Table.Td>
      <Table.Td>
        {item.stockYesterday !== null ? <Text>{item.stockYesterday}</Text> : <Text c="dimmed">?</Text>}
      </Table.Td>
      <Table.Td>
        {item.stockToday !== null ? (
          <Text fw={hasStockToday ? 600 : undefined}>{item.stockToday}</Text>
        ) : (
          <Text c="dimmed">?</Text>
        )}
      </Table.Td>

      {isEditing && canStockUpdate && (
        <Table.Td>
          <EditableStockCell
            item={item}
            hasStockToday={hasStockToday}
            initialValue={editedQuantity}
            onCommitQuantity={onCommitQuantity}
            evaluateIntegerExpression={evaluateIntegerExpression}
            evaluateDecimalExpression={evaluateDecimalExpression}
          />
        </Table.Td>
      )}
    </Table.Tr>
  );
});


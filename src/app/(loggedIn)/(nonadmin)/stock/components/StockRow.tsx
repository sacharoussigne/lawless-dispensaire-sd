'use client';

import { memo } from 'react';
import { Badge, Group, Table, Text, Tooltip } from '@mantine/core';
import { IconClipboardCheck } from '@tabler/icons-react';
import type { ItemWithRelations } from '@/types/stock';
import { EditableStockCell } from './EditableStockCell';
import type { EvalResult } from '@/lib/stock/expression';

interface StockRowProps {
  item: ItemWithRelations;
  editedQuantity: number | null;
  isEditing: boolean;
  canStockUpdate: boolean;
  selectedChestId: string | null;
  getTextColor: (backgroundColor: string) => string;
  onCommitQuantity: (itemId: string, quantity: number | null) => void;
  evaluateIntegerExpression: (expression: string) => EvalResult;
  evaluateDecimalExpression: (expression: string) => EvalResult;
}

export const StockRow = memo(function StockRow({
  item,
  editedQuantity,
  isEditing,
  canStockUpdate,
  selectedChestId,
  onCommitQuantity,
  evaluateIntegerExpression,
  evaluateDecimalExpression,
}: StockRowProps) {
  const hasStockToday = item.stockToday !== null;

  const currentStock =
    item.stockToday !== null ? item.stockToday : item.stockYesterday !== null ? item.stockYesterday : null;

  const isStockLow = selectedChestId === null && currentStock !== null && currentStock < item.idealQuantity;

  let backgroundColor: string | undefined = undefined;
  if (isStockLow) {
    if (item.isCraftable || item.companyGroupId === null) backgroundColor = '#fff3cd';
    else backgroundColor = '#f8d7da';
  }

  return (
    <Table.Tr key={item.id} style={{ backgroundColor }}>
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


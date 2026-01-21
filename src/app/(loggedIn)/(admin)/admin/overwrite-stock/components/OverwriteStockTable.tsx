'use client';

import { DataTable } from 'mantine-datatable';
import { NumberInput, Text } from '@mantine/core';
import type { ItemWithStock } from '@/types/overwriteStock';

interface OverwriteStockTableProps {
  items: ItemWithStock[];
  loading: boolean;
  stockValues: Record<string, number | null>;
  onStockChange: (itemId: string, value: number | null) => void;
}

export function OverwriteStockTable({
  items,
  loading,
  stockValues,
  onStockChange,
}: OverwriteStockTableProps) {
  return (
    <DataTable
      records={items}
      columns={[
        {
          accessor: 'name',
          title: 'Objet',
          render: (item: ItemWithStock) => <Text fw={500}>{item.name}</Text>,
        },
        {
          accessor: 'category',
          title: 'Catégorie',
          render: (item: ItemWithStock) => <Text>{item.category?.name || '-'}</Text>,
        },
        {
          accessor: 'stockForDate',
          title: 'Stock actuel',
          render: (item: ItemWithStock) => <Text>{item.stockForDate ?? '-'}</Text>,
        },
        {
          accessor: 'newStock',
          title: 'Nouveau stock',
          render: (item: ItemWithStock) => {
            const currentValue = stockValues[item.id];
            return (
              <NumberInput
                value={
                  currentValue !== null && currentValue !== undefined
                    ? currentValue
                    : undefined
                }
                onChange={(value) =>
                  onStockChange(item.id, typeof value === 'number' ? value : null)
                }
                placeholder="0"
                min={0}
                style={{ width: 120 }}
              />
            );
          },
        },
      ]}
      fetching={loading}
      noRecordsText="Aucun objet trouvé"
    />
  );
}


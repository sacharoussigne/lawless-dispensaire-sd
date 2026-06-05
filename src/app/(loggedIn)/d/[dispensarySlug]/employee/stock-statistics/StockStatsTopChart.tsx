'use client';

import { Box, Group, Progress, Stack, Text, Tooltip } from '@mantine/core';
import {
  getStockStatsBarColor,
  getStockStatsValueColor,
  type StockStatsDisplayMode,
} from '@/lib/stock/movements';

export type StockStatsChartRow = {
  itemId: string;
  itemName: string;
  value: number;
};

export function StockStatsTopChart({
  rows,
  displayMode,
}: {
  rows: StockStatsChartRow[];
  displayMode: StockStatsDisplayMode;
}) {
  const maxMagnitude = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const color = getStockStatsBarColor(displayMode);

  return (
    <Stack gap="sm">
      {rows.map((row) => {
        const percent = (Math.abs(row.value) / maxMagnitude) * 100;
        return (
          <Box key={row.itemId}>
            <Group justify="space-between" gap="md" wrap="nowrap" mb={4}>
              <Tooltip label={row.itemName} withArrow multiline maw={320}>
                <Text size="sm" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
                  {row.itemName}
                </Text>
              </Tooltip>
              <Text
                size="sm"
                fw={600}
                ta="right"
                style={{
                  flexShrink: 0,
                  color: getStockStatsValueColor(displayMode, row.value),
                }}
              >
                {row.value.toLocaleString('fr-FR')}
              </Text>
            </Group>
            <Progress
              value={percent}
              color={color}
              size="lg"
              radius="sm"
              aria-label={`${row.itemName}: ${row.value}`}
              styles={{
                root: { backgroundColor: 'var(--disp-table-header)' },
              }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

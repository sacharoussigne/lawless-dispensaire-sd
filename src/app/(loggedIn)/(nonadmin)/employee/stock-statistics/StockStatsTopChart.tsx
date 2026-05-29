'use client';

import { Box, Group, Progress, Stack, Text, Tooltip } from '@mantine/core';
import type { StockStatsDisplayMode } from '@/lib/stock/movements';

export type StockStatsChartRow = {
  itemId: string;
  itemName: string;
  value: number;
};

function barColor(mode: StockStatsDisplayMode): string {
  if (mode === 'consumed') return 'red';
  if (mode === 'added') return 'green';
  return 'blue';
}

function valueTextColor(mode: StockStatsDisplayMode, value: number): string | undefined {
  if (mode !== 'net') return undefined;
  if (value < 0) return 'var(--mantine-color-red-6)';
  if (value > 0) return 'var(--mantine-color-green-6)';
  return undefined;
}

export function StockStatsTopChart({
  rows,
  displayMode,
}: {
  rows: StockStatsChartRow[];
  displayMode: StockStatsDisplayMode;
}) {
  const maxMagnitude = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const color = barColor(displayMode);

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
                style={{ flexShrink: 0, color: valueTextColor(displayMode, row.value) }}
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
            />
          </Box>
        );
      })}
    </Stack>
  );
}

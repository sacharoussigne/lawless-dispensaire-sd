'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Checkbox,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput, DatesProvider } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import { getStockConsumptionStats } from '@/app/_actions/stock';
import type { StockConsumptionStatsResult } from '@/app/_actions/stock/statistics';
import { handleAction } from '@/lib/action';
import { getMondayOfCurrentWeek, getTodayStart } from '@/lib/date';
import {
  getDisplayModeLabel,
  getDisplayValue,
  getStockStatsValueColor,
  type StockStatsDisplayMode,
  type StockStatsItemRowWithDisplay,
} from '@/lib/stock/movements';
import { StockStatsTopChart } from './StockStatsTopChart';

const PAGE_SIZE = 25;
const TOP_N_OPTIONS = ['10', '15', '20'];

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function StockStatisticsPageClient() {
  const { dispensarySlug } = usePermissions();
  const defaultFrom = getMondayOfCurrentWeek();
  const defaultTo = getTodayStart();

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([defaultFrom, defaultTo]);
  const [displayMode, setDisplayMode] = useState<StockStatsDisplayMode>('consumed');
  const [showZeroItems, setShowZeroItems] = useState(false);
  const [showFullDetail, setShowFullDetail] = useState(false);
  const [topN, setTopN] = useState('15');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StockConsumptionStatsResult | null>(null);
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<StockStatsItemRowWithDisplay>>({
    columnAccessor: 'displayValue',
    direction: 'desc',
  });

  const loadStats = useCallback(async () => {
    const [from, to] = dateRange;
    if (!from || !to) return;

    try {
      setLoading(true);
      const result = await getStockConsumptionStats(dispensarySlug!, { from, to });
      const data = handleAction(result);
      if (data) setStats(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors du chargement';
      notifications.show({ title: 'Erreur', message, color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    setPage(1);
  }, [displayMode, searchQuery, categoryFilter, showZeroItems, dateRange]);

  const categoryOptions = useMemo(() => {
    if (!stats) return [];
    const categories = new Map<string, string>();
    stats.items.forEach((row) => {
      categories.set(row.categoryId, row.categoryName);
    });
    return Array.from(categories.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }, [stats]);

  const rowsWithDisplay = useMemo(() => {
    if (!stats) return [];
    return stats.items.map((row) => ({
      ...row,
      displayValue: getDisplayValue(row, displayMode),
    }));
  }, [stats, displayMode]);

  const filteredRows = useMemo(() => {
    let rows = rowsWithDisplay;

    if (!showZeroItems) {
      rows = rows.filter((row) => row.displayValue !== 0);
    }

    if (categoryFilter) {
      rows = rows.filter((row) => row.categoryId === categoryFilter);
    }

    const q = searchQuery.trim();
    if (q) {
      const nq = normalizeString(q);
      rows = rows.filter(
        (row) =>
          normalizeString(row.itemName).includes(nq) ||
          normalizeString(row.categoryName).includes(nq),
      );
    }

    const { columnAccessor, direction } = sortStatus;
    const sorted = [...rows].sort((a, b) => {
      const m = direction === 'asc' ? 1 : -1;
      if (columnAccessor === 'itemName') {
        return a.itemName.localeCompare(b.itemName, 'fr', { sensitivity: 'base' }) * m;
      }
      if (columnAccessor === 'categoryName') {
        return a.categoryName.localeCompare(b.categoryName, 'fr', { sensitivity: 'base' }) * m;
      }
      if (columnAccessor === 'consumed') return (a.consumed - b.consumed) * m;
      if (columnAccessor === 'added') return (a.added - b.added) * m;
      if (columnAccessor === 'net') return (a.net - b.net) * m;
      return (a.displayValue - b.displayValue) * m;
    });

    return sorted;
  }, [rowsWithDisplay, showZeroItems, categoryFilter, searchQuery, sortStatus]);

  const paginatedRows = useMemo(() => {
    const from = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(from, from + PAGE_SIZE);
  }, [filteredRows, page]);

  const modeTotal = useMemo(() => {
    return filteredRows.reduce((sum, row) => sum + row.displayValue, 0);
  }, [filteredRows]);

  const topItem = useMemo(() => {
    if (filteredRows.length === 0) return null;
    if (displayMode === 'net') {
      return filteredRows.reduce((best, row) =>
        Math.abs(row.displayValue) > Math.abs(best.displayValue) ? row : best,
      );
    }
    return filteredRows.reduce((best, row) =>
      row.displayValue > best.displayValue ? row : best,
    );
  }, [filteredRows, displayMode]);

  const chartRows = useMemo(() => {
    const n = parseInt(topN, 10);
    const sorted =
      displayMode === 'net'
        ? [...filteredRows].sort(
            (a, b) => Math.abs(b.displayValue) - Math.abs(a.displayValue),
          )
        : [...filteredRows].sort((a, b) => b.displayValue - a.displayValue);
    return sorted.slice(0, n).map((row) => ({
      itemId: row.itemId,
      itemName: row.itemName,
      value: row.displayValue,
    }));
  }, [filteredRows, topN, displayMode]);

  const modeLabel = getDisplayModeLabel(displayMode);
  const valueColumnTitle = modeLabel;

  return (
    <DatesProvider settings={{ locale: 'fr' }}>
      <Stack gap="lg">
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" verticalSpacing="md">
              <DatePickerInput
                type="range"
                label="Période"
                placeholder="Choisir les dates"
                value={dateRange}
                onChange={(value) => {
                  const [from, to] = value as [Date | null, Date | null];
                  setDateRange([from, to]);
                }}
                valueFormat="D MMM YYYY"
                clearable={false}
              />
              <Stack gap={6}>
                <Text component="label" size="sm" fw={500}>
                  Affichage
                </Text>
                <SegmentedControl
                  fullWidth
                  value={displayMode}
                  onChange={(v) => setDisplayMode(v as StockStatsDisplayMode)}
                  data={[
                    { label: 'Consommation', value: 'consumed' },
                    { label: 'Ajouts', value: 'added' },
                    { label: 'Stat réelle', value: 'net' },
                  ]}
                />
              </Stack>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" verticalSpacing="md">
              <TextInput
                label="Recherche"
                placeholder="Rechercher un objet…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
              />
              <Select
                label="Catégorie"
                placeholder="Toutes les catégories"
                clearable
                data={categoryOptions}
                value={categoryFilter}
                onChange={setCategoryFilter}
              />
              <Select
                label="Top graphique"
                data={TOP_N_OPTIONS.map((v) => ({ value: v, label: `Top ${v}` }))}
                value={topN}
                onChange={(v) => setTopN(v ?? '15')}
              />
              <Stack gap="sm" justify="flex-end" h="100%" pb={4}>
                <Checkbox
                  label="Afficher les items à zéro"
                  checked={showZeroItems}
                  onChange={(e) => setShowZeroItems(e.currentTarget.checked)}
                />
                <Checkbox
                  label="Détail complet"
                  checked={showFullDetail}
                  onChange={(e) => setShowFullDetail(e.currentTarget.checked)}
                />
              </Stack>
            </SimpleGrid>
          </Stack>
        </Paper>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              Total — {modeLabel}
            </Text>
            <Text
              size="xl"
              fw={700}
              style={{ color: getStockStatsValueColor(displayMode, modeTotal) }}
            >
              {modeTotal.toLocaleString('fr-FR')}
            </Text>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              Top — {modeLabel}
            </Text>
            <Text size="lg" fw={600} lineClamp={2}>
              {topItem ? `${topItem.itemName} (${topItem.displayValue})` : '—'}
            </Text>
          </Paper>
        </SimpleGrid>

        {chartRows.length > 0 && (
          <Paper withBorder p="md" radius="md">
            <Title order={4} mb="md">
              Top {topN} — {modeLabel}
            </Title>
            <StockStatsTopChart rows={chartRows} displayMode={displayMode} />
          </Paper>
        )}

        <Paper withBorder p="md" radius="md">
          <DataTable
            withTableBorder
            borderRadius="md"
            striped
            highlightOnHover
            fetching={loading}
            records={paginatedRows}
            totalRecords={filteredRows.length}
            recordsPerPage={PAGE_SIZE}
            page={page}
            onPageChange={setPage}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            columns={[
              {
                accessor: 'itemName',
                title: 'Objet',
                sortable: true,
              },
              {
                accessor: 'categoryName',
                title: 'Catégorie',
                sortable: true,
              },
              {
                accessor: 'displayValue',
                title: valueColumnTitle,
                sortable: true,
                textAlign: 'right',
                render: (row) => (
                  <Text
                    fw={600}
                    style={{ color: getStockStatsValueColor(displayMode, row.displayValue) }}
                  >
                    {row.displayValue.toLocaleString('fr-FR')}
                  </Text>
                ),
              },
              ...(showFullDetail
                ? [
                    {
                      accessor: 'consumed',
                      title: 'Consommé',
                      sortable: true,
                      textAlign: 'right' as const,
                      render: (row: StockStatsItemRowWithDisplay) =>
                        row.consumed.toLocaleString('fr-FR'),
                    },
                    {
                      accessor: 'added',
                      title: 'Ajouté',
                      sortable: true,
                      textAlign: 'right' as const,
                      render: (row: StockStatsItemRowWithDisplay) =>
                        row.added.toLocaleString('fr-FR'),
                    },
                    {
                      accessor: 'net',
                      title: 'Net',
                      sortable: true,
                      textAlign: 'right' as const,
                      render: (row: StockStatsItemRowWithDisplay) => (
                        <Text style={{ color: getStockStatsValueColor('net', row.net) }}>
                          {row.net.toLocaleString('fr-FR')}
                        </Text>
                      ),
                    },
                  ]
                : []),
            ]}
            noRecordsText="Aucun mouvement sur cette période"
          />
        </Paper>

        {stats && (
          <Box>
            <Text size="xs" c="dimmed">
              Totaux globaux sur la période (tous items) : consommé {stats.totals.consumed} · ajouté{' '}
              {stats.totals.added} · net {stats.totals.net}
            </Text>
          </Box>
        )}
      </Stack>
    </DatesProvider>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import {
  getDisplayModeLabel,
  getStockStatsValueColor,
  type StockStatsDisplayMode,
  type StockStatsItemRowWithDisplay,
} from '@/lib/stock/movements';
import {
  attachDisplayValues,
  buildCategoryOptions,
  filterStockStatsRows,
  pickTopChartRows,
  pickTopItem,
  sortStockStatsRows,
  sumDisplayValues,
} from '@/lib/stock/statsClient';
import {
  getMondayOfCurrentWeek,
  getTodayStart,
  parsePickerDate,
} from '@/lib/date';
import { useStockConsumptionStats } from './hooks/useStockStatisticsQueries';
import { StockStatsTopChart } from './StockStatsTopChart';

const PAGE_SIZE = 25;
const TOP_N_OPTIONS = ['10', '15', '20'];

export default function StockStatisticsPageClient() {
  const defaultFrom = getMondayOfCurrentWeek();
  const defaultTo = getTodayStart();

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([defaultFrom, defaultTo]);
  const [displayMode, setDisplayMode] = useState<StockStatsDisplayMode>('consumed');
  const [showZeroItems, setShowZeroItems] = useState(false);
  const [showFullDetail, setShowFullDetail] = useState(false);
  const [topN, setTopN] = useState('15');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<StockStatsItemRowWithDisplay>>({
    columnAccessor: 'displayValue',
    direction: 'desc',
  });

  const [from, to] = dateRange;
  const { data: stats = null, isFetching: loading } = useStockConsumptionStats(from, to);

  useEffect(() => {
    setPage(1);
  }, [displayMode, searchQuery, categoryFilter, showZeroItems, dateRange]);

  const categoryOptions = useMemo(
    () => (stats ? buildCategoryOptions(stats.items) : []),
    [stats],
  );

  const filteredRows = useMemo(() => {
    if (!stats) return [];
    const withDisplay = attachDisplayValues(stats.items, displayMode);
    const filtered = filterStockStatsRows(withDisplay, {
      showZeroItems,
      categoryFilter,
      searchQuery,
    });
    return sortStockStatsRows(filtered, sortStatus);
  }, [stats, displayMode, showZeroItems, categoryFilter, searchQuery, sortStatus]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const modeTotal = useMemo(() => sumDisplayValues(filteredRows), [filteredRows]);
  const topItem = useMemo(
    () => pickTopItem(filteredRows, displayMode),
    [filteredRows, displayMode],
  );
  const chartRows = useMemo(
    () => pickTopChartRows(filteredRows, parseInt(topN, 10), displayMode),
    [filteredRows, topN, displayMode],
  );

  const modeLabel = getDisplayModeLabel(displayMode);

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
                  const [rawFrom, rawTo] = (value ?? [null, null]) as [
                    Date | string | null,
                    Date | string | null,
                  ];
                  setDateRange([parsePickerDate(rawFrom), parsePickerDate(rawTo)]);
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
                title: modeLabel,
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
              Totaux globaux sur la période (tous items, hors filtres) : consommé{' '}
              {stats.totals.consumed} · ajouté {stats.totals.added} · net {stats.totals.net}
            </Text>
          </Box>
        )}
      </Stack>
    </DatesProvider>
  );
}

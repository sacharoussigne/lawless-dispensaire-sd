'use client';

import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { getStockConsumptionStats } from '@/app/_actions/stock/statistics';
import type { StockConsumptionStatsResult } from '@/app/_actions/stock/statistics';
import { handleAction } from '@/lib/action';
import { toDateRangeKey } from '@/lib/date';
import { stockKeys } from '@/lib/stock/queryKeys';
import { DEFAULT_STALE_TIME_MS } from '@/lib/react-query/QueryProvider';

async function fetchStockConsumptionStats(
  dispensarySlug: string,
  from: Date,
  to: Date,
): Promise<StockConsumptionStatsResult> {
  const result = await getStockConsumptionStats(dispensarySlug, { from, to });
  return handleAction(result) as StockConsumptionStatsResult;
}

export function useStockConsumptionStats(from: Date | null, to: Date | null) {
  const { dispensarySlug } = usePermissions();
  const fromKey = from ? toDateRangeKey(from) : '';
  const toKey = to ? toDateRangeKey(to) : '';

  return useQuery({
    queryKey: stockKeys.statsConsumption(dispensarySlug!, fromKey, toKey),
    queryFn: () => fetchStockConsumptionStats(dispensarySlug!, from!, to!),
    enabled: Boolean(dispensarySlug && from && to),
    placeholderData: (previous) => previous,
    staleTime: DEFAULT_STALE_TIME_MS,
  });
}

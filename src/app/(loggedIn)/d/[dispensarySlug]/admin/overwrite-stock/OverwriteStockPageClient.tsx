'use client';

import { useRequiredDispensarySlug } from '@/app/_contexts/PermissionsContext';
import { useState, useMemo } from 'react';
import {
  Container,
  Title,
  Paper,
  TextInput,
  Button,
  Group,
  Stack,
  Alert,
  Select,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { OverwriteStockTable } from './components/OverwriteStockTable';
import type { ItemWithStock } from '@/types/overwriteStock';
import type { ChestListItem } from '@/types/chests';
import {
  overwriteStockKeys,
  useOverwriteStockItems,
  useOverwriteStockMutation,
} from './hooks/useOverwriteStockQueries';

interface OverwriteStockPageClientProps {
  initialItems: ItemWithStock[];
  initialDate: string;
  initialChests: ChestListItem[];
}

export default function OverwriteStockPageClient({
  initialItems,
  initialDate,
  initialChests,
}: OverwriteStockPageClientProps) {
  const dispensarySlug = useRequiredDispensarySlug();
  const chests = initialChests;
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedChestId, setSelectedChestId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, number | null>>({});

  const { data: items = [], isFetching: loading } = useOverwriteStockItems(
    selectedDate,
    selectedChestId,
    initialItems,
    initialDate,
  );
  const overwriteMutation = useOverwriteStockMutation();

  const stockValues = useMemo(() => {
    const values: Record<string, number | null> = {};
    items.forEach((item) => {
      values[item.id] = edits[item.id] ?? item.stockForDate ?? null;
    });
    return values;
  }, [items, edits]);

  const hasChanges = Object.keys(edits).length > 0;

  const handleStockChange = (itemId: string, value: number | null) => {
    if (selectedChestId === null) return;
    setEdits((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleSave = async () => {
    if (!selectedDate || selectedChestId === null) return;

    const stocks = Object.entries(stockValues)
      .map(([itemId, quantity]) => ({
        itemId,
        quantity: quantity ?? 0,
      }))
      .filter((stock) => stock.quantity !== null && stock.quantity !== undefined);

    const chestName = chests.find((c) => c.id === selectedChestId)?.name || 'le coffre sélectionné';
    const queryKey = overwriteStockKeys.items(dispensarySlug, selectedDate, selectedChestId);

    try {
      await overwriteMutation.mutateAsync({
        date: selectedDate,
        chestId: selectedChestId,
        stocks,
        chestName,
        queryKey,
      });
      setEdits({});
    } catch {
      // Notification handled in mutation hook
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Title order={1}>Écraser les stocks</Title>

        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Attention"
          color="amber"
        >
          Cette action va supprimer tous les stocks existants pour la date sélectionnée et le coffre sélectionné (hors « Tous les coffres »), puis les remplacer par les nouvelles valeurs.
          Cette opération est irréversible.
        </Alert>

        <Paper shadow="sm" p="md" withBorder>
          <Stack gap="md">
            <Group align="flex-end">
              <TextInput
                label="Date"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.currentTarget.value);
                  setEdits({});
                }}
                style={{ width: 200 }}
              />
              <Select
                label="Coffre"
                placeholder="Sélectionner un coffre"
                data={[
                  { value: '', label: 'Tous les coffres' },
                  ...chests.map((chest) => ({
                    value: chest.id,
                    label: chest.name,
                  })),
                ]}
                value={selectedChestId ?? ''}
                onChange={(value) => {
                  setSelectedChestId(value === '' ? null : value);
                  setEdits({});
                }}
                required
                clearable={false}
                style={{ width: 200 }}
              />
            </Group>

            <OverwriteStockTable
              items={items}
              loading={loading}
              stockValues={stockValues}
              onStockChange={handleStockChange}
              readOnly={selectedChestId === null}
            />

            <Group justify="flex-end" mt="md">
              <Button
                onClick={handleSave}
                loading={overwriteMutation.isPending}
                color="danger"
                disabled={items.length === 0 || loading || selectedChestId === null || !hasChanges}
              >
                Écraser les stocks
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

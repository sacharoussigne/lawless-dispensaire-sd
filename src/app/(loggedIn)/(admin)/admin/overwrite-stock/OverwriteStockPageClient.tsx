'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Paper,
  TextInput,
  Button,
  Group,
  Stack,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { getItemsWithStockForDate, overwriteStockForDate } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import dayjs from '@/lib/dayjs';
import { OverwriteStockTable } from './components/OverwriteStockTable';
import type { ItemWithStock } from '@/types/overwriteStock';

interface OverwriteStockPageClientProps {
  initialItems: ItemWithStock[];
  initialDate: string;
}

export default function OverwriteStockPageClient({
  initialItems,
  initialDate,
}: OverwriteStockPageClientProps) {
  const [items, setItems] = useState<ItemWithStock[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [stockValues, setStockValues] = useState<Record<string, number | null>>({});
  const [initialStockValues, setInitialStockValues] = useState<Record<string, number | null>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const loadItems = async () => {
    if (!selectedDate) return;

    try {
      setLoading(true);
      const date = dayjs(selectedDate).toDate();
      const result = await getItemsWithStockForDate(date);
      const data = handleAction(result);

      if (data && Array.isArray(data)) {
        setItems(data);
        const initialValues: Record<string, number | null> = {};
        data.forEach((item: ItemWithStock) => {
          initialValues[item.id] = item.stockForDate ?? null;
        });
        setInitialStockValues({ ...initialValues });
        setStockValues({ ...initialValues });
        setHasChanges(false);
      } else {
        setItems([]);
        setStockValues({});
        setInitialStockValues({});
        setHasChanges(false);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des objets',
        color: 'red',
      });
      setItems([]);
      setStockValues({});
      setInitialStockValues({});
      setHasChanges(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setStockValues({});
    setInitialStockValues({});
    setItems([]);
    setHasChanges(false);
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleStockChange = (itemId: string, value: number | null) => {
    setStockValues((prev) => ({
      ...prev,
      [itemId]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedDate) return;

    try {
      setSaving(true);
      const date = dayjs(selectedDate).toDate();

      // Envoyer tous les stocks (modifiés et non modifiés) pour préserver les stocks non modifiés
      const stocks = Object.entries(stockValues)
        .map(([itemId, quantity]) => ({
          itemId,
          quantity: quantity ?? 0,
        }))
        .filter((stock) => stock.quantity !== null && stock.quantity !== undefined);

      const result = await overwriteStockForDate({
        date,
        stocks,
      });

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Stocks écrasés avec succès',
        color: 'green',
      });
      setHasChanges(false);
      loadItems();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'écrasement des stocks',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Title order={1}>Écraser les stocks</Title>

        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Attention"
          color="orange"
        >
          Cette action va supprimer tous les stocks existants pour la date sélectionnée et les remplacer par les nouvelles valeurs.
          Cette opération est irréversible.
        </Alert>

        <Paper shadow="sm" p="md" withBorder>
          <Stack gap="md">
            <Group align="flex-end">
              <TextInput
                label="Date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.currentTarget.value)}
                style={{ width: 200 }}
              />
              <Button onClick={loadItems} loading={loading}>
                Charger
              </Button>
            </Group>

            <OverwriteStockTable
              items={items}
              loading={loading}
              stockValues={stockValues}
              onStockChange={handleStockChange}
            />

            <Group justify="flex-end" mt="md">
              <Button
                onClick={handleSave}
                loading={saving}
                color="red"
                disabled={items.length === 0 || loading}
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


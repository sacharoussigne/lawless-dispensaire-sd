'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
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
  Select,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { getItemsWithStockForDate, overwriteStockForDate } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import dayjs from '@/lib/dayjs';
import { OverwriteStockTable } from './components/OverwriteStockTable';
import type { ItemWithStock } from '@/types/overwriteStock';
import type { ChestWithStockHistory } from '@/types/chests';

interface OverwriteStockPageClientProps {
  initialItems: ItemWithStock[];
  initialDate: string;
  initialChests: ChestWithStockHistory[];
}

export default function OverwriteStockPageClient({
  initialItems,
  initialDate,
  initialChests,
}: OverwriteStockPageClientProps) {
  const { dispensarySlug } = usePermissions();
  const [items, setItems] = useState<ItemWithStock[]>(initialItems);
  const [chests] = useState<ChestWithStockHistory[]>(initialChests);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  // null = "Tous les coffres", une valeur = coffre spécifique
  const [selectedChestId, setSelectedChestId] = useState<string | null>(null);
  const [stockValues, setStockValues] = useState<Record<string, number | null>>({});
  const [initialStockValues, setInitialStockValues] = useState<Record<string, number | null>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const loadItems = async () => {
    if (!selectedDate) return;

    try {
      setLoading(true);
      const date = dayjs(selectedDate).toDate();
      const result = await getItemsWithStockForDate(dispensarySlug!, date, selectedChestId);
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
  }, [selectedDate, selectedChestId]);

  const handleStockChange = (itemId: string, value: number | null) => {
    // Mode "Tous les coffres" = lecture seule
    if (selectedChestId === null) return;
    setStockValues((prev) => ({
      ...prev,
      [itemId]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedDate || selectedChestId === null) return;

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

      const result = await overwriteStockForDate(dispensarySlug!, {
        date,
        stocks,
        chestId: selectedChestId,
      });

      handleAction(result);
      const chestName = chests.find(c => c.id === selectedChestId)?.name || 'le coffre sélectionné';
      notifications.show({
        title: 'Succès',
        message: `Stocks écrasés avec succès pour ${chestName}`,
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
                onChange={(e) => setSelectedDate(e.currentTarget.value)}
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
                onChange={(value) => setSelectedChestId(value === '' ? null : value)}
                required
                clearable={false}
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
              readOnly={selectedChestId === null}
            />

            <Group justify="flex-end" mt="md">
              <Button
                onClick={handleSave}
                loading={saving}
                color="red"
                disabled={items.length === 0 || loading || selectedChestId === null}
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


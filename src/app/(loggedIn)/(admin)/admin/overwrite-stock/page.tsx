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
  Text,
  NumberInput,
  Alert,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import { getItemsWithStockForDate, overwriteStockForDate } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import dayjs from '@/lib/dayjs';

interface ItemWithStock {
  id: string;
  name: string;
  description: string | null;
  idealQuantity: number;
  isCraftable: boolean;
  categoryId: string;
  companyGroupId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string; color: string; order?: number } | null;
  companyGroup: { id: string; name: string } | null;
  stockForDate: number | null;
  stockHistoryId: string | null;
}

export default function OverwriteStockPage() {
  const [items, setItems] = useState<ItemWithStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    dayjs().format('YYYY-MM-DD')
  );
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
        // Initialiser les valeurs de stock avec les valeurs actuelles (même si null)
        const initialValues: Record<string, number | null> = {};
        data.forEach((item: ItemWithStock) => {
          // Toujours définir la valeur, même si c'est null
          initialValues[item.id] = item.stockForDate ?? null;
        });
        // Sauvegarder les valeurs initiales pour comparer les changements
        setInitialStockValues({ ...initialValues });
        // Forcer la mise à jour en créant un nouvel objet
        setStockValues({ ...initialValues });
        setHasChanges(false);
      } else {
        // Si pas de données, réinitialiser quand même
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
      // En cas d'erreur, réinitialiser aussi
      setItems([]);
      setStockValues({});
      setInitialStockValues({});
      setHasChanges(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Réinitialiser complètement les valeurs avant de charger
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
      
      // Ne sauvegarder que les items qui ont été modifiés
      // ou qui ont une valeur explicitement définie (y compris 0)
      const stocks = Object.entries(stockValues)
        .filter(([itemId, quantity]) => {
          const initialValue = initialStockValues[itemId];
          // Inclure si :
          // 1. La valeur a changé par rapport à l'initial
          // 2. OU la valeur est explicitement 0 (même si initial était null)
          const hasChanged = quantity !== initialValue;
          const isExplicitZero = quantity === 0 && initialValue === null;
          return hasChanged || isExplicitZero;
        })
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

            <DataTable
              records={items}
              columns={[
                {
                  accessor: 'name',
                  title: 'Objet',
                  render: (item: ItemWithStock) => (
                    <Text fw={500}>{item.name}</Text>
                  ),
                },
                {
                  accessor: 'category',
                  title: 'Catégorie',
                  render: (item: ItemWithStock) => (
                    <Text>{item.category?.name || '-'}</Text>
                  ),
                },
                {
                  accessor: 'stockForDate',
                  title: 'Stock actuel',
                  render: (item: ItemWithStock) => (
                    <Text>{item.stockForDate ?? '-'}</Text>
                  ),
                },
                {
                  accessor: 'newStock',
                  title: 'Nouveau stock',
                  render: (item: ItemWithStock) => {
                    const currentValue = stockValues[item.id];
                    return (
                      <NumberInput
                        value={currentValue !== null && currentValue !== undefined ? currentValue : undefined}
                        onChange={(value) => handleStockChange(item.id, typeof value === 'number' ? value : null)}
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


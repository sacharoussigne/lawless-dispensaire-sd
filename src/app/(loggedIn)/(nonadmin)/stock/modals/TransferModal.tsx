'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  Select,
  NumberInput,
  Text,
  Button,
  Group,
  Paper,
  Alert,
  Badge,
} from '@mantine/core';
import { IconAlertCircle, IconArrowRight } from '@tabler/icons-react';
import { transferStock } from '@/app/_actions/stock';
import { getItemsWithStock } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import type { ItemWithRelations } from '@/types/stock';
import type { ChestWithStockHistory } from '@/types/chests';

interface TransferModalProps {
  opened: boolean;
  onClose: () => void;
  items: ItemWithRelations[];
  chests: ChestWithStockHistory[];
  initialSourceChestId?: string | null; // Coffre source pré-sélectionné depuis la vue stock
  onTransfer: () => void; // Callback après un transfert réussi
}

export default function TransferModal({
  opened,
  onClose,
  items,
  chests,
  initialSourceChestId = null,
  onTransfer,
}: TransferModalProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sourceChestId, setSourceChestId] = useState<string | null>(initialSourceChestId);
  const [destinationChestId, setDestinationChestId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [loading, setLoading] = useState(false);
  const [itemsWithStock, setItemsWithStock] = useState<ItemWithRelations[]>(items);
  const [loadingItems, setLoadingItems] = useState(false);

  // Mettre à jour sourceChestId quand initialSourceChestId change
  useEffect(() => {
    if (opened && initialSourceChestId !== null) {
      setSourceChestId(initialSourceChestId);
    } else if (opened && initialSourceChestId === null) {
      setSourceChestId(null);
    }
  }, [opened, initialSourceChestId]);

  // Charger les items avec le stock du coffre source sélectionné
  useEffect(() => {
    if (opened && sourceChestId) {
      const loadItemsForChest = async () => {
        setLoadingItems(true);
        try {
          const result = await getItemsWithStock(sourceChestId);
          const data = handleAction(result);
          if (data) {
            setItemsWithStock(data);
            // Réinitialiser la sélection de l'item quand le coffre source change
            setSelectedItemId(null);
            setQuantity(1);
          }
        } catch (error: any) {
          notifications.show({
            title: 'Erreur',
            message: error.message || 'Erreur lors du chargement des stocks',
            color: 'red',
          });
        } finally {
          setLoadingItems(false);
        }
      };
      loadItemsForChest();
    } else if (opened && !sourceChestId) {
      // Si aucun coffre source n'est sélectionné, réinitialiser les items
      setItemsWithStock([]);
      setSelectedItemId(null);
      setQuantity(1);
    }
  }, [opened, sourceChestId]);

  // Réinitialiser les états quand la modal se ferme
  useEffect(() => {
    if (!opened) {
      setSelectedItemId(null);
      setDestinationChestId(null);
      setQuantity(1);
    }
  }, [opened]);

  // Obtenir le stock disponible de l'item sélectionné dans le coffre source
  const selectedItem = itemsWithStock.find((item) => item.id === selectedItemId);
  const availableStock = selectedItem?.stockToday ?? null;

  // Filtrer les coffres pour exclure le coffre source de la liste des destinations
  const availableDestinationChests = chests.filter((chest) => chest.id !== sourceChestId);

  // Options pour les items (seulement ceux qui ont du stock dans le coffre source)
  const itemOptions = itemsWithStock
    .filter((item) => item.stockToday !== null && item.stockToday > 0)
    .map((item) => ({
      value: item.id,
      label: `${item.name} (Stock: ${item.stockToday})`,
    }));

  // Options pour les coffres
  const sourceChestOptions = chests.map((chest) => ({
    value: chest.id,
    label: chest.name,
  }));

  const destinationChestOptions = availableDestinationChests.map((chest) => ({
    value: chest.id,
    label: chest.name,
  }));

  const handleTransfer = async () => {
    if (!selectedItemId || !sourceChestId || !destinationChestId || quantity === '' || quantity <= 0) {
      notifications.show({
        title: 'Erreur',
        message: 'Veuillez remplir tous les champs correctement',
        color: 'red',
      });
      return;
    }

    if (availableStock === null || quantity > availableStock) {
      notifications.show({
        title: 'Erreur',
        message: `Stock insuffisant. Stock disponible: ${availableStock ?? 0}`,
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);
      const result = await transferStock({
        itemId: selectedItemId,
        quantity: typeof quantity === 'number' ? quantity : 0,
        sourceChestId,
        destinationChestId,
      });

      handleAction(result);

      const itemName = selectedItem?.name || 'l\'item';
      const sourceChestName = chests.find((c) => c.id === sourceChestId)?.name || 'le coffre source';
      const destinationChestName = chests.find((c) => c.id === destinationChestId)?.name || 'le coffre destination';

      notifications.show({
        title: 'Succès',
        message: `${quantity} ${itemName}(s) transféré(s) de ${sourceChestName} vers ${destinationChestName}`,
        color: 'green',
      });

      onTransfer();
      onClose();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du transfert',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const canTransfer =
    selectedItemId !== null &&
    sourceChestId !== null &&
    destinationChestId !== null &&
    quantity !== '' &&
    quantity > 0 &&
    availableStock !== null &&
    quantity <= availableStock;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Transférer des items entre coffres"
      size="lg"
    >
      <Stack gap="md">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Information"
          color="blue"
        >
          Transférez des items d'un coffre source vers un coffre destination. Le stock sera automatiquement mis à jour dans les deux coffres.
        </Alert>

        <Select
          label="Coffre source"
          placeholder="Sélectionner le coffre source"
          data={sourceChestOptions}
          value={sourceChestId}
          onChange={(value) => setSourceChestId(value)}
          required
          clearable={false}
        />

        {sourceChestId && (
          <>
            <Select
              label="Item à transférer"
              placeholder="Sélectionner un item"
              data={itemOptions}
              value={selectedItemId}
              onChange={(value) => {
                setSelectedItemId(value);
                // Réinitialiser la quantité quand on change d'item
                setQuantity(1);
              }}
              required
              disabled={loadingItems}
              searchable
            />

            {selectedItem && availableStock !== null && (
              <Paper p="sm" withBorder>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Stock disponible dans le coffre source:
                  </Text>
                  <Badge color="blue" size="lg">
                    {availableStock}
                  </Badge>
                </Group>
              </Paper>
            )}

            <NumberInput
              label="Quantité à transférer"
              placeholder="Entrer la quantité"
              value={quantity}
              onChange={(value) => setQuantity(typeof value === 'number' ? value : '')}
              min={1}
              max={availableStock ?? undefined}
              required
              disabled={!selectedItemId}
            />

            {selectedItemId && quantity !== '' && quantity > 0 && availableStock !== null && (
              <>
                {quantity > availableStock ? (
                  <Alert color="red" icon={<IconAlertCircle size={16} />}>
                    Quantité supérieure au stock disponible ({availableStock})
                  </Alert>
                ) : (
                  <Paper p="sm" withBorder>
                    <Group gap="xs" justify="center">
                      <Badge color="blue" size="lg">
                        {sourceChestId ? chests.find((c) => c.id === sourceChestId)?.name : 'Source'}
                      </Badge>
                      <IconArrowRight size={20} />
                      <Badge color="green" size="lg">
                        {quantity} {selectedItem?.name}
                      </Badge>
                      <IconArrowRight size={20} />
                      <Badge color="orange" size="lg">
                        {destinationChestId ? chests.find((c) => c.id === destinationChestId)?.name : 'Destination'}
                      </Badge>
                    </Group>
                  </Paper>
                )}
              </>
            )}

            <Select
              label="Coffre destination"
              placeholder="Sélectionner le coffre destination"
              data={destinationChestOptions}
              value={destinationChestId}
              onChange={(value) => setDestinationChestId(value)}
              required
              clearable={false}
            />
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleTransfer}
            loading={loading}
            disabled={!canTransfer}
            color="blue"
          >
            Transférer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

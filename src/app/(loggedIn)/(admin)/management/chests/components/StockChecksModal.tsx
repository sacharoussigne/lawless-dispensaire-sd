'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Stack, Switch, MultiSelect, Group, Button, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { handleAction } from '@/lib/action';
import { getChestStockCheckConfigs, upsertChestStockCheckConfig } from '@/app/_actions/stockChecks';
import type { ChestStockCheckConfigsResponse } from '@/app/_actions/stockChecks';
import type { ChestWithStockHistory } from '@/types/chests';

interface StockChecksModalProps {
  opened: boolean;
  onClose: () => void;
  chest: ChestWithStockHistory | null;
}

export function StockChecksModal({ opened, onClose, chest }: StockChecksModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payload, setPayload] = useState<ChestStockCheckConfigsResponse | null>(null);

  const [isEnabled, setIsEnabled] = useState(true);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    if (!opened) return;
    if (!chest) return;

    const run = async () => {
      try {
        setLoading(true);
        const result = await getChestStockCheckConfigs();
        const data = handleAction(result);
        if (!data) return;

        setPayload(data);

        const existing = data.configsByChestId[chest.id];
        if (existing) {
          setIsEnabled(existing.isEnabled);
          setCategoryIds(existing.categoryIds);
        } else {
          setIsEnabled(true);
          setCategoryIds([]);
        }
      } catch (error: any) {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors du chargement de la configuration',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [opened, chest]);

  const categoryOptions = useMemo(() => {
    if (!payload) return [];
    return payload.categories.map((c) => ({ value: c.id, label: c.name }));
  }, [payload]);

  const handleSave = async () => {
    if (!chest) return;
    try {
      setSaving(true);
      const result = await upsertChestStockCheckConfig({
        chestId: chest.id,
        isEnabled,
        categoryIds,
      });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Configuration sauvegardée',
        color: 'green',
      });
      onClose();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la sauvegarde',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={chest ? `Vérifications de stock — ${chest.name}` : 'Vérifications de stock'}
      size="lg"
    >
      <Stack gap="md">
        <Switch
          checked={isEnabled}
          onChange={(e) => setIsEnabled(Boolean(e.currentTarget.checked))}
          label="Activer la vérification"
          description="Si désactivé, aucun item ne sera signalé comme sous la quantité minimale pour ce coffre."
          disabled={loading || !chest}
        />

        <MultiSelect
          label="Catégories vérifiées"
          description="Laisse vide pour vérifier toutes les catégories (comportement par défaut)."
          data={categoryOptions}
          value={categoryIds}
          onChange={setCategoryIds}
          searchable
          clearable
          disabled={loading || !chest}
        />

        <Text size="sm" c="dimmed">
          Remarque : sur « Tous les coffres », le stock comparé reste la somme de tous les coffres. Cette configuration
          ne change que l’affichage des alertes.
        </Text>

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose} disabled={saving}>
            Fermer
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={loading || !chest}>
            Sauvegarder
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


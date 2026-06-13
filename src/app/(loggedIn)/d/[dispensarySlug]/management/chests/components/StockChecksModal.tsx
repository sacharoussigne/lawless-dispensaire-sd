'use client';

import { useEffect, useMemo, useState } from 'react';
import { Stack, Switch, MultiSelect, Button, Text } from '@mantine/core';
import type { ChestWithStockHistory } from '@/types/chests';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import {
  useChestStockCheckForm,
  type useUpsertChestStockCheckConfigMutation,
} from '../hooks/useChestsQueries';

interface StockChecksModalProps {
  opened: boolean;
  onClose: () => void;
  chest: ChestWithStockHistory | null;
  upsertMutation: ReturnType<typeof useUpsertChestStockCheckConfigMutation>;
}

export function StockChecksModal({
  opened,
  onClose,
  chest,
  upsertMutation,
}: StockChecksModalProps) {
  const { data, isFetching } = useChestStockCheckForm(chest?.id ?? null, opened);

  const [isEnabled, setIsEnabled] = useState(true);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    if (!opened || !chest || !data) return;

    if (data.config) {
      setIsEnabled(data.config.isEnabled);
      setCategoryIds(data.config.categoryIds);
    } else {
      setIsEnabled(true);
      setCategoryIds([]);
    }
  }, [opened, chest, data]);

  const categoryOptions = useMemo(() => {
    if (!data) return [];
    return data.categories.map((c) => ({ value: c.id, label: c.name }));
  }, [data]);

  const handleSave = async () => {
    if (!chest) return;

    try {
      await upsertMutation.mutateAsync({
        chestId: chest.id,
        isEnabled,
        categoryIds,
      });
      onClose();
    } catch {
      // Error notification handled by mutation
    }
  };

  const loading = isFetching && !data;

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title={chest ? `Vérifications de stock — ${chest.name}` : 'Vérifications de stock'}
      size="lg"
      footer={
        <AppModalFooter>
          <Button variant="subtle" color="slate" onClick={onClose} disabled={upsertMutation.isPending}>
            Fermer
          </Button>
          <Button
            onClick={handleSave}
            loading={upsertMutation.isPending}
            disabled={loading || !chest}
          >
            Sauvegarder
          </Button>
        </AppModalFooter>
      }
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
          Remarque : sur « Tous les coffres », le stock comparé reste la somme de tous les coffres.
          Cette configuration ne change que l&apos;affichage des alertes.
        </Text>
      </Stack>
    </AppModal>
  );
}

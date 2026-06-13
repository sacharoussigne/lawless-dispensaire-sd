'use client';

import { useState, useEffect } from 'react';
import { Stack, Button, Text, Select, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { ChestWithStockHistory } from '@/types/chests';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type { useDeleteChestMutation } from '../hooks/useChestsQueries';

interface DeleteChestModalProps {
  opened: boolean;
  onClose: () => void;
  chestToDelete: ChestWithStockHistory | null;
  allChests: ChestWithStockHistory[];
  deleteMutation: ReturnType<typeof useDeleteChestMutation>;
}

export function DeleteChestModal({
  opened,
  onClose,
  chestToDelete,
  allChests,
  deleteMutation,
}: DeleteChestModalProps) {
  const [targetChestId, setTargetChestId] = useState('');

  useEffect(() => {
    if (opened && chestToDelete) {
      const otherChests = allChests.filter((c) => c.id !== chestToDelete.id);
      if (otherChests.length > 0) {
        setTargetChestId(otherChests[0].id);
      } else {
        setTargetChestId('');
      }
    } else {
      setTargetChestId('');
    }
  }, [opened, chestToDelete, allChests]);

  const isLastChest = allChests.length <= 1;

  const otherChests = chestToDelete
    ? allChests.filter((c) => c.id !== chestToDelete.id)
    : [];

  const handleDelete = async () => {
    if (!chestToDelete || !targetChestId) return;

    try {
      await deleteMutation.mutateAsync({
        id: chestToDelete.id,
        targetChestId,
      });
      onClose();
    } catch {
      // Error notification handled by mutation
    }
  };

  const chestOptions = otherChests.map((chest) => ({
    value: chest.id,
    label: chest.name,
  }));

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Confirmer la suppression"
      size="md"
      footer={
        <AppModalFooter>
          <Button variant="subtle" color="slate" onClick={onClose}>
            Annuler
          </Button>
          <Button
            color="danger"
            onClick={handleDelete}
            loading={deleteMutation.isPending}
            disabled={isLastChest || !targetChestId}
          >
            Supprimer
          </Button>
        </AppModalFooter>
      }
    >
      <Stack>
        {isLastChest ? (
          <Alert icon={<IconAlertCircle size={16} />} title="Impossible de supprimer" color="danger">
            Il doit y avoir au moins un coffre. Vous ne pouvez pas supprimer le dernier coffre.
          </Alert>
        ) : (
          <>
            <Text>
              Êtes-vous sûr de vouloir supprimer le coffre{' '}
              <strong>{chestToDelete?.name}</strong> ?
            </Text>
            {chestToDelete && chestToDelete.stockHistoryCount > 0 && (
              <Text c="amber" size="sm" mt="xs">
                Ce coffre contient {chestToDelete.stockHistoryCount} enregistrement(s) de stock.
                Tous les stocks seront transférés vers le coffre de destination.
              </Text>
            )}
            <Select
              label="Coffre de destination"
              placeholder="Sélectionner un coffre"
              description="Les stocks de ce coffre seront transférés vers le coffre sélectionné"
              data={chestOptions}
              value={targetChestId}
              onChange={(value) => setTargetChestId(value || '')}
              required
              searchable
            />
          </>
        )}
      </Stack>
    </AppModal>
  );
}

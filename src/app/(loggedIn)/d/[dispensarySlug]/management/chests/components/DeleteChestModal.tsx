'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useState, useEffect } from 'react';
import { Modal, Stack, Button, Group, Text, Select, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { deleteChest } from '@/app/_actions/chests';
import { handleAction } from '@/lib/action';
import { IconAlertCircle } from '@tabler/icons-react';
import type { ChestWithStockHistory } from '@/types/chests';

interface DeleteChestModalProps {
  opened: boolean;
  onClose: () => void;
  chestToDelete: ChestWithStockHistory | null;
  allChests: ChestWithStockHistory[];
  onSuccess: () => void;
}

export function DeleteChestModal({
  opened,
  onClose,
  chestToDelete,
  allChests,
  onSuccess,
}: DeleteChestModalProps) {
  const { dispensarySlug } = usePermissions();
  const [targetChestId, setTargetChestId] = useState<string>('');

  // Réinitialiser le sélecteur quand le modal s'ouvre ou que le coffre change
  useEffect(() => {
    if (opened && chestToDelete) {
      // Sélectionner automatiquement le premier autre coffre disponible
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

  // Vérifier s'il n'y a qu'un seul coffre
  const isLastChest = allChests.length <= 1;

  // Obtenir les autres coffres (exclure celui à supprimer)
  const otherChests = chestToDelete
    ? allChests.filter((c) => c.id !== chestToDelete.id)
    : [];

  const handleDelete = async () => {
    if (!chestToDelete || !targetChestId) return;

    try {
      const result = await deleteChest(dispensarySlug!, {
        id: chestToDelete.id,
        targetChestId: targetChestId,
      });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Coffre supprimé avec succès. Les stocks ont été transférés.',
        color: 'green',
      });
      onClose();
      onSuccess();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  const chestOptions = otherChests.map((chest) => ({
    value: chest.id,
    label: chest.name,
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Confirmer la suppression"
      size="md"
    >
      <Stack>
        {isLastChest ? (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Impossible de supprimer"
            color="red"
          >
            Il doit y avoir au moins un coffre. Vous ne pouvez pas supprimer le dernier coffre.
          </Alert>
        ) : (
          <>
            <Text>
              Êtes-vous sûr de vouloir supprimer le coffre{' '}
              <strong>{chestToDelete?.name}</strong> ?
            </Text>
            {chestToDelete && chestToDelete.stockHistory.length > 0 && (
              <Text c="orange" size="sm" mt="xs">
                Ce coffre contient {chestToDelete.stockHistory.length} enregistrement(s) de stock.
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
        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Annuler
          </Button>
          <Button
            color="red"
            onClick={handleDelete}
            disabled={isLastChest || !targetChestId}
          >
            Supprimer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

'use client';

import { Group, Button, Checkbox, Tooltip } from '@mantine/core';
import { IconEdit, IconCheck, IconX, IconTools, IconArrowsExchange } from '@tabler/icons-react';
import { PageHeader } from '@/app/_components/PageHeader/PageHeader';

interface StockHeaderProps {
  itemsWithStockToday: number;
  selectedChestId: string | null;
  isEditing: boolean;
  saving: boolean;
  skipHistory: boolean;
  canCraftReadOrWrite: boolean;
  canStockUpdate: boolean;
  onOpenCraft: () => void;
  onOpenTransfer: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onSkipHistoryChange: (value: boolean) => void;
}

export function StockHeader({
  itemsWithStockToday,
  selectedChestId,
  isEditing,
  saving,
  skipHistory,
  canCraftReadOrWrite,
  canStockUpdate,
  onOpenCraft,
  onOpenTransfer,
  onStartEdit,
  onCancelEdit,
  onSave,
  onSkipHistoryChange,
}: StockHeaderProps) {
  return (
    <PageHeader
      title="Stock"
      description="Inventaire par coffre, craft et transferts entre emplacements."
      actions={
        <Group>
            {!isEditing && canCraftReadOrWrite && (
              <Button
                leftSection={<IconTools size={16} />}
                onClick={onOpenCraft}
                variant="light"
              >
                Craft
              </Button>
            )}
            {!isEditing && canStockUpdate && (
              <Button
                leftSection={<IconArrowsExchange size={16} />}
                onClick={onOpenTransfer}
                variant="light"
                color="leather"
              >
                Transférer
              </Button>
            )}
            {selectedChestId !== null && (
              <>
                {!isEditing ? (
                  canStockUpdate && (
                    <Button leftSection={<IconEdit size={16} />} onClick={onStartEdit} variant="light">
                      {itemsWithStockToday > 0 ? 'Mettre à jour le stock' : 'Faire le stock'}
                    </Button>
                  )
                ) : (
                  <>
                    <Tooltip
                      label="Aucun mouvement ne sera enregistré (ex. transfert manuel entre coffres sans utiliser Transférer)."
                      multiline
                      w={280}
                    >
                      <Checkbox
                        label="Écraser (sans historique)"
                        checked={skipHistory}
                        onChange={(e) => onSkipHistoryChange(e.currentTarget.checked)}
                      />
                    </Tooltip>
                    <Button
                      leftSection={<IconX size={16} />}
                      onClick={onCancelEdit}
                      variant="subtle"
                      color="slate"
                    >
                      Annuler
                    </Button>
                    <Button
                      leftSection={<IconCheck size={16} />}
                      onClick={onSave}
                      loading={saving}
                      variant="filled"
                      color="sage"
                    >
                      Sauvegarder
                    </Button>
                  </>
                )}
              </>
            )}
        </Group>
      }
    />
  );
}

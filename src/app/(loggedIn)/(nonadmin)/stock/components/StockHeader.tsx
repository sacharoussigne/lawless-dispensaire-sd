'use client';

import { Group, Title, Badge, Button, Checkbox, Tooltip } from '@mantine/core';
import { IconEdit, IconCheck, IconX, IconTools, IconArrowsExchange } from '@tabler/icons-react';

interface StockHeaderProps {
  itemsWithStockToday: number;
  totalItems: number;
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
  totalItems,
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
    <Group justify="space-between" mb="xl">
      <Title order={1}>Stock</Title>
      <Group>
        {itemsWithStockToday > 0 && (
          <Badge
            color={itemsWithStockToday === totalItems ? 'green' : 'yellow'}
            variant="light"
            size="lg"
          >
            {itemsWithStockToday}/{totalItems} objets stockés aujourd&apos;hui
          </Badge>
        )}
        <Group>
          {!isEditing && canCraftReadOrWrite && (
            <Button
              leftSection={<IconTools size={16} />}
              onClick={onOpenCraft}
              variant="light"
              color="blue"
            >
              Craft
            </Button>
          )}
          {!isEditing && canStockUpdate && (
            <Button
              leftSection={<IconArrowsExchange size={16} />}
              onClick={onOpenTransfer}
              variant="light"
              color="violet"
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
                    color="gray"
                  >
                    Annuler
                  </Button>
                  <Button
                    leftSection={<IconCheck size={16} />}
                    onClick={onSave}
                    loading={saving}
                    variant="filled"
                    color="green"
                  >
                    Sauvegarder
                  </Button>
                </>
              )}
            </>
          )}
        </Group>
      </Group>
    </Group>
  );
}


'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Container, Button, Group } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { ChestModal } from './components/ChestModal';
import { DeleteChestModal } from './components/DeleteChestModal';
import { ReorderChestsModal } from './components/ReorderChestsModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { PageHeader } from '@/app/_components/PageHeader/PageHeader';
import { ChestsTable } from './components/ChestsTable';
import { StockChecksModal } from './components/StockChecksModal';
import type { ChestWithStockHistory } from '@/types/chests';
import { normalizeString } from '@/lib/string/normalizeString';
import { sortChests } from '@/lib/chests/sortChests';
import {
  useManagementChests,
  useCreateChestMutation,
  useUpdateChestMutation,
  useDeleteChestMutation,
  useReorderChestsMutation,
  useUpsertChestStockCheckConfigMutation,
} from './hooks/useChestsQueries';

interface ChestsPageClientProps {
  initialChests: ChestWithStockHistory[];
}

export default function ChestsPageClient({ initialChests }: ChestsPageClientProps) {
  const { data: chests = [], isFetching } = useManagementChests(initialChests);
  const createMutation = useCreateChestMutation();
  const updateMutation = useUpdateChestMutation();
  const deleteMutation = useDeleteChestMutation();
  const reorderMutation = useReorderChestsMutation();
  const upsertStockCheckMutation = useUpsertChestStockCheckConfigMutation();

  const [modalOpened, setModalOpened] = useState(false);
  const [editingChest, setEditingChest] = useState<ChestWithStockHistory | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [chestToDelete, setChestToDelete] = useState<ChestWithStockHistory | null>(null);
  const [reorderModalOpened, setReorderModalOpened] = useState(false);
  const [stockChecksModalOpened, setStockChecksModalOpened] = useState(false);
  const [chestForStockChecks, setChestForStockChecks] = useState<ChestWithStockHistory | null>(
    null,
  );

  const [nameFilter, setNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { paginatedChests, totalRecords } = useMemo(() => {
    const filtered = chests.filter((chest) => {
      if (!nameFilter) return true;
      return normalizeString(chest.name).includes(normalizeString(nameFilter));
    });
    const sorted = sortChests(filtered);
    return {
      paginatedChests: sorted.slice((page - 1) * pageSize, page * pageSize),
      totalRecords: sorted.length,
    };
  }, [chests, nameFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  const handleEdit = useCallback((chest: ChestWithStockHistory) => {
    setEditingChest(chest);
    setModalOpened(true);
  }, []);

  const handleConfigureStockChecks = useCallback((chest: ChestWithStockHistory) => {
    setChestForStockChecks(chest);
    setStockChecksModalOpened(true);
  }, []);

  const handleDelete = useCallback((chest: ChestWithStockHistory) => {
    setChestToDelete(chest);
    setDeleteModalOpened(true);
  }, []);

  const handleNameFilterChange = useCallback((value: string) => {
    setNameFilter(value);
  }, []);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, []);

  const openCreateModal = () => {
    setEditingChest(null);
    setModalOpened(true);
  };

  return (
    <Container size="xl" py="xl">
      <PageHeader
        title="Coffres"
        description="Gestion des coffres de stock et de leurs vérifications."
        actions={
          <Group>
            <Button
              variant="light"
              onClick={() => setReorderModalOpened(true)}
              disabled={chests.length === 0}
            >
              Réordonner
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
              Créer un coffre
            </Button>
          </Group>
        }
      />

      <ActiveFilters
        filters={[
          {
            label: 'Nom',
            value: nameFilter,
            onRemove: () => setNameFilter(''),
          },
        ]}
      />

      <ChestsTable
        items={paginatedChests}
        loading={isFetching}
        nameFilter={nameFilter}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        totalChests={chests.length}
        onNameFilterChange={handleNameFilterChange}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onConfigureStockChecks={handleConfigureStockChecks}
        onDelete={handleDelete}
      />

      <ChestModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingChest(null);
        }}
        editingChest={editingChest}
        createMutation={createMutation}
        updateMutation={updateMutation}
      />

      <DeleteChestModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setChestToDelete(null);
        }}
        chestToDelete={chestToDelete}
        allChests={chests}
        deleteMutation={deleteMutation}
      />

      <ReorderChestsModal
        opened={reorderModalOpened}
        onClose={() => setReorderModalOpened(false)}
        chests={chests}
        reorderMutation={reorderMutation}
      />

      <StockChecksModal
        opened={stockChecksModalOpened}
        chest={chestForStockChecks}
        onClose={() => {
          setStockChecksModalOpened(false);
          setChestForStockChecks(null);
        }}
        upsertMutation={upsertStockCheckMutation}
      />
    </Container>
  );
}

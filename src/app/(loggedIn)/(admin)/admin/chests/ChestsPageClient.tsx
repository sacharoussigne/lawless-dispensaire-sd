'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { getChests } from '@/app/_actions/chests';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { ChestModal } from './components/ChestModal';
import { DeleteChestModal } from './components/DeleteChestModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { ChestsTable } from './components/ChestsTable';
import type { ChestWithStockHistory } from '@/types/chests';

interface ChestsPageClientProps {
  initialChests: ChestWithStockHistory[];
}

// Fonction pour normaliser les chaînes (enlever les accents et mettre en minuscule)
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function ChestsPageClient({
  initialChests,
}: ChestsPageClientProps) {
  const [chests, setChests] = useState<ChestWithStockHistory[]>(initialChests);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingChest, setEditingChest] = useState<ChestWithStockHistory | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [chestToDelete, setChestToDelete] = useState<ChestWithStockHistory | null>(null);

  const [nameFilter, setNameFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const loadChests = async () => {
    try {
      setLoading(true);
      const result = await getChests();
      const data = handleAction(result);
      if (data) {
        setChests(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des coffres',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (chest: ChestWithStockHistory) => {
    setEditingChest(chest);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingChest(null);
    setModalOpened(true);
  };

  // Filtrer les coffres par nom
  const filteredChests = chests.filter((chest) => {
    const matchesName =
      !nameFilter ||
      normalizeString(chest.name).includes(normalizeString(nameFilter));
    return matchesName;
  });

  // Trier par date de création (plus récent en premier)
  const sortedChests = [...filteredChests].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Calculer la pagination
  const totalRecords = sortedChests.length;
  const paginatedChests = sortedChests.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [nameFilter]);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Coffres</Title>
        <Group>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Créer un coffre
          </Button>
        </Group>
      </Group>

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
        loading={loading}
        nameFilter={nameFilter}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onNameFilterChange={(value: string) => setNameFilter(value)}
        onPageChange={(p: number) => setPage(p)}
        onEdit={handleEdit}
        onDelete={(chest: ChestWithStockHistory) => {
          setChestToDelete(chest);
          setDeleteModalOpened(true);
        }}
      />

      <ChestModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingChest(null);
        }}
        editingChest={editingChest}
        onSuccess={loadChests}
      />

      <DeleteChestModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setChestToDelete(null);
        }}
        chestToDelete={chestToDelete}
        onSuccess={loadChests}
      />
    </Container>
  );
}

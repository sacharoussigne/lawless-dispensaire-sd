'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { getLocations } from '@/app/_actions/locations';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import { LocationModal } from './components/LocationModal';
import { DeleteLocationModal } from './components/DeleteLocationModal';
import { ActiveFilters } from '@/app/_components/ActiveFilters/ActiveFilters';
import { LocationsTable } from './components/LocationsTable';
import type { LocationWithCompanies } from '@/types/locations';

interface LocationsPageClientProps {
  initialLocations: LocationWithCompanies[];
}

// Fonction pour normaliser les chaînes (enlever les accents et mettre en minuscule)
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export default function LocationsPageClient({
  initialLocations,
}: LocationsPageClientProps) {
  const [locations, setLocations] = useState<LocationWithCompanies[]>(initialLocations);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationWithCompanies | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<LocationWithCompanies | null>(null);

  const [nameFilter, setNameFilter] = useState<string>('');
  const [descriptionFilter, setDescriptionFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const result = await getLocations();
      const data = handleAction(result);
      if (data) {
        setLocations(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des lieux',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (location: LocationWithCompanies) => {
    setEditingLocation(location);
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingLocation(null);
    setModalOpened(true);
  };

  // Filtrer les lieux par nom et description
  const filteredLocations = locations.filter((location) => {
    const matchesName =
      !nameFilter ||
      normalizeString(location.name).includes(normalizeString(nameFilter));
    const matchesDescription =
      !descriptionFilter ||
      (location.description &&
        normalizeString(location.description).includes(
          normalizeString(descriptionFilter)
        ));
    return matchesName && matchesDescription;
  });

  // Trier par nom
  const sortedLocations = [...filteredLocations].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );

  // Calculer la pagination
  const totalRecords = sortedLocations.length;
  const paginatedLocations = sortedLocations.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [nameFilter, descriptionFilter]);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Lieux</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer un lieu
        </Button>
      </Group>

      <ActiveFilters
        filters={[
          {
            label: 'Nom',
            value: nameFilter,
            onRemove: () => setNameFilter(''),
          },
          {
            label: 'Description',
            value: descriptionFilter,
            onRemove: () => setDescriptionFilter(''),
          },
        ]}
      />

      <LocationsTable
        locations={paginatedLocations}
        loading={loading}
        nameFilter={nameFilter}
        descriptionFilter={descriptionFilter}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onNameFilterChange={(value) => setNameFilter(value)}
        onDescriptionFilterChange={(value) => setDescriptionFilter(value)}
        onPageChange={(p) => setPage(p)}
        onEdit={handleEdit}
        onDelete={(location) => {
          setLocationToDelete(location);
          setDeleteModalOpened(true);
        }}
      />

      <LocationModal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingLocation(null);
        }}
        editingLocation={editingLocation}
        onSuccess={loadLocations}
      />

      <DeleteLocationModal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setLocationToDelete(null);
        }}
        locationToDelete={locationToDelete}
        onSuccess={loadLocations}
      />
    </Container>
  );
}


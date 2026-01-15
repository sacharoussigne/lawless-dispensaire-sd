'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Paper,
  TextInput,
  Textarea,
  Button,
  ActionIcon,
  Group,
  Modal,
  Stack,
  Badge,
  Text,
  Flex,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconPlus, IconX } from '@tabler/icons-react';
import { createLocation, getLocations, updateLocation, deleteLocation } from '@/app/_actions/locations';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import { routes } from '@/types/routes';
import Link from 'next/link';
import type { Location } from '@prisma/client';

interface LocationWithCompanies extends Location {
  companies: { id: string; name: string }[];
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationWithCompanies[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationWithCompanies | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<LocationWithCompanies | null>(null);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [descriptionFilter, setDescriptionFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

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

  useEffect(() => {
    loadLocations();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingLocation) {
        result = await updateLocation({
          id: editingLocation.id,
          name: values.name,
          description: values.description || undefined,
        });
      } else {
        result = await createLocation({
          name: values.name,
          description: values.description || undefined,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingLocation
          ? 'Lieu modifié avec succès'
          : 'Lieu créé avec succès',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingLocation(null);
      loadLocations();
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, form);
      } else {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors de la sauvegarde',
          color: 'red',
        });
      }
    }
  };

  const handleEdit = (location: LocationWithCompanies) => {
    setEditingLocation(location);
    form.setValues({
      name: location.name,
      description: location.description || '',
    });
    setModalOpened(true);
  };

  const handleDelete = async () => {
    if (!locationToDelete) return;

    try {
      const result = await deleteLocation({ id: locationToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Lieu supprimé avec succès',
        color: 'green',
      });
      setDeleteModalOpened(false);
      setLocationToDelete(null);
      loadLocations();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  const openCreateModal = () => {
    setEditingLocation(null);
    form.reset();
    setModalOpened(true);
  };

  // Fonction pour normaliser les chaînes (enlever les accents et mettre en minuscule)
  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  // Filtrer les lieux par nom et description
  const filteredLocations = locations.filter((location) => {
    const matchesName = !nameFilter || 
      normalizeString(location.name).includes(normalizeString(nameFilter));
    const matchesDescription = !descriptionFilter || 
      (location.description && 
       normalizeString(location.description).includes(normalizeString(descriptionFilter)));
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

      {/* Affichage des filtres actifs */}
      {(nameFilter || descriptionFilter) && (
        <Paper shadow="sm" p="md" withBorder mb="md">
          <Flex align="center" gap="md" wrap="wrap">
            <Text fw={500}>Filtres :</Text>
            {nameFilter && (
              <Badge
                variant="light"
                size="lg"
                rightSection={
                  <ActionIcon
                    size="xs"
                    color="blue"
                    radius="xl"
                    variant="transparent"
                    onClick={() => setNameFilter('')}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                }
              >
                Nom: {nameFilter}
              </Badge>
            )}
            {descriptionFilter && (
              <Badge
                variant="light"
                size="lg"
                rightSection={
                  <ActionIcon
                    size="xs"
                    color="blue"
                    radius="xl"
                    variant="transparent"
                    onClick={() => setDescriptionFilter('')}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                }
              >
                Description: {descriptionFilter}
              </Badge>
            )}
          </Flex>
        </Paper>
      )}

      <Paper shadow="sm" p="md" withBorder>
        <DataTable
          records={paginatedLocations}
          columns={[
            {
              accessor: 'name',
              title: 'Nom',
              filter: (
                <TextInput
                  placeholder="Rechercher un nom..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.currentTarget.value)}
                  style={{ minWidth: 200 }}
                />
              ),
            },
            {
              accessor: 'description',
              title: 'Description',
              render: (location: LocationWithCompanies) => location.description || '-',
              filter: (
                <TextInput
                  placeholder="Rechercher une description..."
                  value={descriptionFilter}
                  onChange={(e) => setDescriptionFilter(e.currentTarget.value)}
                  style={{ minWidth: 200 }}
                />
              ),
            },
            {
              accessor: 'companies.length',
              title: 'Nombre d\'entreprises',
              render: (location: LocationWithCompanies) =>
                location.companies.length > 0 ? (
                  <Link
                    href={`${routes.admin.companies}?locationId=${location.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <span style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                      {location.companies.length}
                    </span>
                  </Link>
                ) : (
                  location.companies.length
                ),
            },
            {
              accessor: 'actions',
              title: 'Actions',
              render: (location: LocationWithCompanies) => (
                <Group gap="xs">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => handleEdit(location)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => {
                      setLocationToDelete(location);
                      setDeleteModalOpened(true);
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ),
            },
          ]}
          fetching={loading}
          noRecordsText={
            nameFilter || descriptionFilter
              ? 'Aucun lieu trouvé avec ces filtres'
              : 'Aucun lieu trouvé'
          }
          striped
          highlightOnHover
          minHeight={200}
          totalRecords={totalRecords}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={(p) => setPage(p)}
          paginationSize="sm"
          paginationText={({ from, to, totalRecords }) =>
            `${from} - ${to} sur ${totalRecords} lieux`
          }
        />
      </Paper>

      {/* Modal de création/modification */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          form.reset();
          setEditingLocation(null);
        }}
        title={editingLocation ? 'Modifier le lieu' : 'Créer un lieu'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nom"
              placeholder="Nom du lieu"
              required
              {...form.getInputProps('name')}
            />
            <Textarea
              label="Description"
              placeholder="Description du lieu (optionnel)"
              rows={4}
              {...form.getInputProps('description')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setModalOpened(false);
                  form.reset();
                  setEditingLocation(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingLocation ? 'Modifier' : 'Créer'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setLocationToDelete(null);
        }}
        title="Confirmer la suppression"
        size="md"
      >
        <Stack>
          <p>
            Êtes-vous sûr de vouloir supprimer le lieu{' '}
            <strong>{locationToDelete?.name}</strong> ?
            {locationToDelete && locationToDelete.companies.length > 0 && (
              <span style={{ color: 'red', display: 'block', marginTop: '8px' }}>
                Attention : Ce lieu contient {locationToDelete.companies.length} entreprise(s).
              </span>
            )}
          </p>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpened(false);
                setLocationToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button color="red" onClick={handleDelete}>
              Supprimer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}


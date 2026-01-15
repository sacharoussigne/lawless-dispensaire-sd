'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Paper,
  TextInput,
  Textarea,
  Button,
  Table,
  ActionIcon,
  Group,
  Modal,
  Stack,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { createLocation, getLocations, updateLocation, deleteLocation } from '@/app/_actions/locations';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { Location } from '@prisma/client';

interface LocationWithShops extends Location {
  shops: { id: string; name: string }[];
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<LocationWithShops[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationWithShops | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<LocationWithShops | null>(null);

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
        message: error.message || 'Erreur lors du chargement des locations',
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
          ? 'Location modifiée avec succès'
          : 'Location créée avec succès',
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

  const handleEdit = (location: LocationWithShops) => {
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
        message: 'Location supprimée avec succès',
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

  const rows = locations.map((location) => (
    <Table.Tr key={location.id}>
      <Table.Td>{location.name}</Table.Td>
      <Table.Td>{location.description || '-'}</Table.Td>
      <Table.Td>{location.shops.length}</Table.Td>
      <Table.Td>
        {new Date(location.createdAt).toLocaleDateString('fr-FR')}
      </Table.Td>
      <Table.Td>
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
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Dashboard Admin - Locations</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer une location
        </Button>
      </Group>

      <Paper shadow="sm" p="md" withBorder>
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Nombre de boutiques</Table.Th>
                <Table.Th>Date de création</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ textAlign: 'center' }}>
                    Chargement...
                  </Table.Td>
                </Table.Tr>
              ) : rows.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ textAlign: 'center' }}>
                    Aucune location trouvée
                  </Table.Td>
                </Table.Tr>
              ) : (
                rows
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>

      {/* Modal de création/modification */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          form.reset();
          setEditingLocation(null);
        }}
        title={editingLocation ? 'Modifier la location' : 'Créer une location'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nom"
              placeholder="Nom de la location"
              required
              {...form.getInputProps('name')}
            />
            <Textarea
              label="Description"
              placeholder="Description de la location (optionnel)"
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
            Êtes-vous sûr de vouloir supprimer la location{' '}
            <strong>{locationToDelete?.name}</strong> ?
            {locationToDelete && locationToDelete.shops.length > 0 && (
              <span style={{ color: 'red', display: 'block', marginTop: '8px' }}>
                Attention : Cette location contient {locationToDelete.shops.length} boutique(s).
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


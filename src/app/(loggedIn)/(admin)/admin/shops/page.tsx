'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Paper,
  TextInput,
  Button,
  Table,
  ActionIcon,
  Group,
  Modal,
  Stack,
  Select,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { createShop, getShops, updateShop, deleteShop } from '@/app/_actions/shops';
import { getLocations } from '@/app/_actions/locations';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { Shop, Location } from '@prisma/client';

interface ShopWithRelations extends Shop {
  location: { id: string; name: string };
  itemTypes: { id: string }[];
}

export default function ShopsPage() {
  const [shops, setShops] = useState<ShopWithRelations[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<ShopWithRelations | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      name: '',
      locationId: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      locationId: (value) => (!value ? 'La location est requise' : null),
    },
  });

  const loadShops = async () => {
    try {
      setLoading(true);
      const result = await getShops();
      const data = handleAction(result);
      if (data) {
        setShops(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des magasins',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const result = await getLocations();
      const data = handleAction(result);
      if (data) {
        setLocations(data);
      }
    } catch (error: any) {
      // Silently fail, locations are optional
    }
  };

  useEffect(() => {
    loadShops();
    loadLocations();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingShop) {
        result = await updateShop({
          id: editingShop.id,
          name: values.name,
          locationId: values.locationId,
        });
      } else {
        result = await createShop({
          name: values.name,
          locationId: values.locationId,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingShop
          ? 'Magasin modifié avec succès'
          : 'Magasin créé avec succès',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingShop(null);
      loadShops();
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

  const handleEdit = (shop: ShopWithRelations) => {
    setEditingShop(shop);
    form.setValues({
      name: shop.name,
      locationId: shop.locationId,
    });
    setModalOpened(true);
  };

  const handleDelete = async () => {
    if (!shopToDelete) return;

    try {
      const result = await deleteShop({ id: shopToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Magasin supprimé avec succès',
        color: 'green',
      });
      setDeleteModalOpened(false);
      setShopToDelete(null);
      loadShops();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  const openCreateModal = () => {
    setEditingShop(null);
    form.reset();
    setModalOpened(true);
  };

  const locationOptions = locations.map((location) => ({
    value: location.id,
    label: location.name,
  }));

  // Filtrer les magasins par location
  const filteredShops = locationFilter
    ? shops.filter((shop) => shop.locationId === locationFilter)
    : shops;

  const rows = filteredShops.map((shop) => (
    <Table.Tr key={shop.id}>
      <Table.Td>{shop.name}</Table.Td>
      <Table.Td>{shop.location.name}</Table.Td>
      <Table.Td>{shop.itemTypes.length}</Table.Td>
      <Table.Td>
        {new Date(shop.createdAt).toLocaleDateString('fr-FR')}
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon
            variant="light"
            color="blue"
            onClick={() => handleEdit(shop)}
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="red"
            onClick={() => {
              setShopToDelete(shop);
              setDeleteModalOpened(true);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const filterOptions = [
    { value: '', label: 'Toutes les locations' },
    ...locationOptions,
  ];

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Dashboard Admin - Magasins</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer un magasin
        </Button>
      </Group>

      <Paper shadow="sm" p="md" withBorder mb="md">
        <Group>
          <Select
            label="Filtrer par location"
            placeholder="Sélectionner une location"
            data={filterOptions}
            value={locationFilter || ''}
            onChange={(value) => setLocationFilter(value || null)}
            clearable
            style={{ minWidth: 250 }}
          />
        </Group>
      </Paper>

      <Paper shadow="sm" p="md" withBorder>
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom</Table.Th>
                <Table.Th>Location</Table.Th>
                <Table.Th>Nombre de types d'items</Table.Th>
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
                    {locationFilter
                      ? 'Aucun magasin trouvé pour cette location'
                      : 'Aucun magasin trouvé'}
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
          setEditingShop(null);
        }}
        title={editingShop ? 'Modifier le magasin' : 'Créer un magasin'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nom"
              placeholder="Nom du magasin"
              required
              {...form.getInputProps('name')}
            />
            <Select
              label="Location"
              placeholder="Sélectionner une location"
              data={locationOptions}
              required
              {...form.getInputProps('locationId')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setModalOpened(false);
                  form.reset();
                  setEditingShop(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingShop ? 'Modifier' : 'Créer'}
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
          setShopToDelete(null);
        }}
        title="Confirmer la suppression"
        size="md"
      >
        <Stack>
          <p>
            Êtes-vous sûr de vouloir supprimer le magasin{' '}
            <strong>{shopToDelete?.name}</strong> ?
            {shopToDelete && shopToDelete.itemTypes.length > 0 && (
              <span style={{ color: 'red', display: 'block', marginTop: '8px' }}>
                Attention : Ce magasin contient {shopToDelete.itemTypes.length} type(s) d'item(s).
              </span>
            )}
          </p>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpened(false);
                setShopToDelete(null);
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


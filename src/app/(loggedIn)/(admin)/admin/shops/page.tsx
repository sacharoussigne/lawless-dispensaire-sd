'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Paper,
  TextInput,
  Button,
  ActionIcon,
  Group,
  Modal,
  Stack,
  Select,
  Badge,
  Text,
  Flex,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconPlus, IconX } from '@tabler/icons-react';
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

function ShopsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [shops, setShops] = useState<ShopWithRelations[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [shopToDelete, setShopToDelete] = useState<ShopWithRelations | null>(null);
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const form = useForm({
    initialValues: {
      name: '',
      locationId: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      locationId: (value) => (!value ? 'Le lieu est requis' : null),
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
    
    // Préremplir le filtre depuis les query params
    const locationIdFromUrl = searchParams.get('locationId');
    if (locationIdFromUrl) {
      setLocationFilter(locationIdFromUrl);
      // Retirer le paramètre de l'URL
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('locationId');
      const newUrl = newSearchParams.toString()
        ? `${window.location.pathname}?${newSearchParams.toString()}`
        : window.location.pathname;
      router.replace(newUrl);
    }
  }, [searchParams, router]);

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

  // Filtrer les magasins par location et nom
  const filteredShops = shops.filter((shop) => {
    const matchesLocation = !locationFilter || shop.locationId === locationFilter;
    const matchesName = !nameFilter || shop.name.toLowerCase().includes(nameFilter.toLowerCase());
    return matchesLocation && matchesName;
  });

  // Calculer la pagination
  const totalRecords = filteredShops.length;
  const paginatedShops = filteredShops.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [locationFilter, nameFilter]);

  const filterOptions = [
    { value: '', label: 'Tous les lieux' },
    ...locationOptions,
  ];

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Magasins</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer un magasin
        </Button>
      </Group>

      {/* Affichage des filtres actifs */}
      {(locationFilter || nameFilter) && (
        <Paper shadow="sm" p="md" withBorder mb="md">
          <Flex align="center" gap="md" wrap="wrap">
            <Text fw={500}>Filtres :</Text>
            {locationFilter && (
              <Badge
                variant="light"
                size="lg"
                rightSection={
                  <ActionIcon
                    size="xs"
                    color="blue"
                    radius="xl"
                    variant="transparent"
                    onClick={() => setLocationFilter(null)}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                }
              >
                Lieu: {locations.find((l) => l.id === locationFilter)?.name || 'Inconnu'}
              </Badge>
            )}
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
          </Flex>
        </Paper>
      )}

      <Paper shadow="sm" p="md" withBorder>
        <DataTable
          records={paginatedShops}
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
              accessor: 'location.name',
              title: 'Lieu',
              filter: (
                <Select
                  placeholder="Tous les lieux"
                  data={filterOptions}
                  value={locationFilter || ''}
                  onChange={(value) => setLocationFilter(value || null)}
                  clearable
                  style={{ minWidth: 200 }}
                />
              ),
            },
            {
              accessor: 'itemTypes.length',
              title: "Nombre de types d'items",
              render: (shop: ShopWithRelations) => shop.itemTypes.length,
            },
            {
              accessor: 'createdAt',
              title: 'Date de création',
              render: (shop: ShopWithRelations) =>
                new Date(shop.createdAt).toLocaleDateString('fr-FR'),
            },
            {
              accessor: 'actions',
              title: 'Actions',
              render: (shop: ShopWithRelations) => (
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
              ),
            },
          ]}
          fetching={loading}
          noRecordsText={
            locationFilter || nameFilter
              ? 'Aucun magasin trouvé avec ces filtres'
              : 'Aucun magasin trouvé'
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
            `${from} - ${to} sur ${totalRecords} magasins`
          }
        />
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
              label="Lieu"
              placeholder="Sélectionner un lieu"
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

export default function ShopsPage() {
  return (
    <Suspense fallback={
      <Container size="xl" py="xl">
        <div>Chargement...</div>
      </Container>
    }>
      <ShopsPageContent />
    </Suspense>
  );
}


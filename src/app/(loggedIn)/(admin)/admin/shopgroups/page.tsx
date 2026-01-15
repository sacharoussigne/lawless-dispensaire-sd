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
  MultiSelect,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconPlus, IconX } from '@tabler/icons-react';
import {
  createShopGroup,
  getShopGroups,
  updateShopGroup,
  deleteShopGroup,
} from '@/app/_actions/shopGroups';
import { getShops } from '@/app/_actions/shops';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { ShopGroup, Shop, Location } from '@prisma/client';

interface ShopGroupWithRelations extends ShopGroup {
  items: { id: string }[];
  shops: {
    id: string;
    shopId?: string;
    shop: Shop & {
      location: {
        id: string;
        name: string;
      };
    };
  }[];
}

interface ShopWithRelations extends Shop {
  location: { id: string; name: string };
  shopGroups: { id: string }[];
}

export default function ShopGroupsPage() {
  const [shopGroups, setShopGroups] = useState<ShopGroupWithRelations[]>([]);
  const [shops, setShops] = useState<ShopWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingShops, setLoadingShops] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingShopGroup, setEditingShopGroup] = useState<ShopGroupWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [shopGroupToDelete, setShopGroupToDelete] = useState<ShopGroupWithRelations | null>(null);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [descriptionFilter, setDescriptionFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      shopIds: [] as string[],
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  const loadShopGroups = async () => {
    try {
      setLoading(true);
      const result = await getShopGroups();
      const data = handleAction(result);
      if (data) {
        setShopGroups(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des groupes de magasins',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadShops = async () => {
    try {
      setLoadingShops(true);
      const result = await getShops();
      const data = handleAction(result);
      if (data && Array.isArray(data)) {
        setShops(data);
      } else {
        setShops([]);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des magasins:', error);
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des magasins',
        color: 'red',
      });
      setShops([]);
    } finally {
      setLoadingShops(false);
    }
  };

  useEffect(() => {
    loadShopGroups();
    loadShops();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingShopGroup) {
        result = await updateShopGroup({
          id: editingShopGroup.id,
          name: values.name,
          description: values.description || undefined,
          shopIds: values.shopIds.length > 0 ? values.shopIds : undefined,
        });
      } else {
        result = await createShopGroup({
          name: values.name,
          description: values.description || undefined,
          shopIds: values.shopIds.length > 0 ? values.shopIds : undefined,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingShopGroup
          ? 'Groupe de magasins modifié avec succès'
          : 'Groupe de magasins créé avec succès',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingShopGroup(null);
      loadShopGroups();
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

  const handleEdit = (shopGroup: ShopGroupWithRelations) => {
    setEditingShopGroup(shopGroup);
    form.setValues({
      name: shopGroup.name,
      description: shopGroup.description || '',
      shopIds: shopGroup.shops.map((s) => s.shopId || s.id),
    });
    setModalOpened(true);
  };

  const handleDelete = async () => {
    if (!shopGroupToDelete) return;

    try {
      const result = await deleteShopGroup({ id: shopGroupToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Groupe de magasins supprimé avec succès',
        color: 'green',
      });
      setDeleteModalOpened(false);
      setShopGroupToDelete(null);
      loadShopGroups();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  const openCreateModal = () => {
    setEditingShopGroup(null);
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

  // Filtrer les groupes de magasins par nom et description
  const filteredShopGroups = shopGroups.filter((shopGroup) => {
    const matchesName = !nameFilter || 
      normalizeString(shopGroup.name).includes(normalizeString(nameFilter));
    const matchesDescription = !descriptionFilter || 
      (shopGroup.description && 
       normalizeString(shopGroup.description).includes(normalizeString(descriptionFilter)));
    return matchesName && matchesDescription;
  });

  // Calculer la pagination
  const totalRecords = filteredShopGroups.length;
  const paginatedShopGroups = filteredShopGroups.slice(
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
        <Title order={1}>Groupes de magasins</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer un groupe de magasins
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
          records={paginatedShopGroups}
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
              render: (shopGroup: ShopGroupWithRelations) => shopGroup.description || '-',
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
              accessor: 'items.length',
              title: "Nombre d'items",
              render: (shopGroup: ShopGroupWithRelations) => shopGroup.items.length,
            },
            {
              accessor: 'shops',
              title: 'Magasins',
              render: (shopGroup: ShopGroupWithRelations) => (
                <Group gap="xs">
                  {shopGroup.shops.length === 0 ? (
                    <Text c="dimmed" size="sm">-</Text>
                  ) : (
                    shopGroup.shops.map((shopRelation) => {
                      const shop = shopRelation.shop;
                      if (!shop) return null;
                      return (
                        <Badge key={shopRelation.id} variant="light" size="sm">
                          {shop.name} - {shop.location.name}
                        </Badge>
                      );
                    })
                  )}
                </Group>
              ),
            },
            {
              accessor: 'actions',
              title: 'Actions',
              render: (shopGroup: ShopGroupWithRelations) => (
                <Group gap="xs">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => handleEdit(shopGroup)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => {
                      setShopGroupToDelete(shopGroup);
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
              ? 'Aucun groupe de magasins trouvé avec ces filtres'
              : 'Aucun groupe de magasins trouvé'
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
            `${from} - ${to} sur ${totalRecords} groupes de magasins`
          }
        />
      </Paper>

      {/* Modal de création/modification */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          form.reset();
          setEditingShopGroup(null);
        }}
        title={editingShopGroup ? 'Modifier le groupe de magasins' : 'Créer un groupe de magasins'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nom"
              placeholder="Nom du groupe de magasins"
              required
              {...form.getInputProps('name')}
            />
            <Textarea
              label="Description"
              placeholder="Description du groupe de magasins (optionnel)"
              rows={4}
              {...form.getInputProps('description')}
            />
            <MultiSelect
              label="Magasins"
              placeholder={loadingShops ? 'Chargement des magasins...' : shops.length === 0 ? 'Aucun magasin disponible' : 'Sélectionner des magasins'}
              data={[...shops]
                .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
                .map((shop) => ({
                  value: shop.id,
                  label: `${shop.name} - ${shop.location.name}`,
                }))}
              value={form.values.shopIds}
              onChange={(value) => form.setFieldValue('shopIds', value)}
              error={form.errors.shopIds}
              searchable
              clearable
              disabled={loadingShops}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setModalOpened(false);
                  form.reset();
                  setEditingShopGroup(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingShopGroup ? 'Modifier' : 'Créer'}
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
          setShopGroupToDelete(null);
        }}
        title="Confirmer la suppression"
        size="md"
      >
        <Stack>
          <p>
            Êtes-vous sûr de vouloir supprimer le groupe de magasins{' '}
            <strong>{shopGroupToDelete?.name}</strong> ?
            {shopGroupToDelete && (shopGroupToDelete.items.length > 0 || shopGroupToDelete.shops.length > 0) && (
              <span style={{ color: 'red', display: 'block', marginTop: '8px' }}>
                Attention : Ce groupe de magasins contient {shopGroupToDelete.items.length} item(s) et {shopGroupToDelete.shops.length} magasin(s).
              </span>
            )}
          </p>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpened(false);
                setShopGroupToDelete(null);
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


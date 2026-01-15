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
  createItemType,
  getItemTypes,
  updateItemType,
  deleteItemType,
} from '@/app/_actions/itemTypes';
import { getShops } from '@/app/_actions/shops';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { ItemType, Shop, Location } from '@prisma/client';

interface ItemTypeWithRelations extends ItemType {
  items: { id: string }[];
  shops: { id: string; shopId?: string; shop: Shop }[];
}

interface ShopWithRelations extends Shop {
  location: { id: string; name: string };
  itemTypes: { id: string }[];
}

export default function ItemTypesPage() {
  const [itemTypes, setItemTypes] = useState<ItemTypeWithRelations[]>([]);
  const [shops, setShops] = useState<ShopWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingShops, setLoadingShops] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingItemType, setEditingItemType] = useState<ItemTypeWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [itemTypeToDelete, setItemTypeToDelete] = useState<ItemTypeWithRelations | null>(null);
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

  const loadItemTypes = async () => {
    try {
      setLoading(true);
      const result = await getItemTypes();
      const data = handleAction(result);
      if (data) {
        setItemTypes(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des types d\'items',
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
    loadItemTypes();
    loadShops();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingItemType) {
        result = await updateItemType({
          id: editingItemType.id,
          name: values.name,
          description: values.description || undefined,
          shopIds: values.shopIds.length > 0 ? values.shopIds : undefined,
        });
      } else {
        result = await createItemType({
          name: values.name,
          description: values.description || undefined,
          shopIds: values.shopIds.length > 0 ? values.shopIds : undefined,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingItemType
          ? 'Type d\'item modifié avec succès'
          : 'Type d\'item créé avec succès',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingItemType(null);
      loadItemTypes();
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

  const handleEdit = (itemType: ItemTypeWithRelations) => {
    setEditingItemType(itemType);
    form.setValues({
      name: itemType.name,
      description: itemType.description || '',
      shopIds: itemType.shops.map((s) => s.shopId || s.id),
    });
    setModalOpened(true);
  };

  const handleDelete = async () => {
    if (!itemTypeToDelete) return;

    try {
      const result = await deleteItemType({ id: itemTypeToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Type d\'item supprimé avec succès',
        color: 'green',
      });
      setDeleteModalOpened(false);
      setItemTypeToDelete(null);
      loadItemTypes();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  const openCreateModal = () => {
    setEditingItemType(null);
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

  // Filtrer les types d'items par nom et description
  const filteredItemTypes = itemTypes.filter((itemType) => {
    const matchesName = !nameFilter || 
      normalizeString(itemType.name).includes(normalizeString(nameFilter));
    const matchesDescription = !descriptionFilter || 
      (itemType.description && 
       normalizeString(itemType.description).includes(normalizeString(descriptionFilter)));
    return matchesName && matchesDescription;
  });

  // Calculer la pagination
  const totalRecords = filteredItemTypes.length;
  const paginatedItemTypes = filteredItemTypes.slice(
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
        <Title order={1}>Types d'items</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer un type d'item
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
          records={paginatedItemTypes}
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
              render: (itemType: ItemTypeWithRelations) => itemType.description || '-',
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
              render: (itemType: ItemTypeWithRelations) => itemType.items.length,
            },
            {
              accessor: 'shops',
              title: 'Magasins',
              render: (itemType: ItemTypeWithRelations) => (
                <Group gap="xs">
                  {itemType.shops.length === 0 ? (
                    <Text c="dimmed" size="sm">-</Text>
                  ) : (
                    itemType.shops.map((shop) => <Badge key={shop.id} variant="light" size="sm">{shop.shop.name}</Badge>)
                  )}
                </Group>
              ),
            },
            {
              accessor: 'actions',
              title: 'Actions',
              render: (itemType: ItemTypeWithRelations) => (
                <Group gap="xs">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => handleEdit(itemType)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => {
                      setItemTypeToDelete(itemType);
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
              ? 'Aucun type d\'item trouvé avec ces filtres'
              : 'Aucun type d\'item trouvé'
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
            `${from} - ${to} sur ${totalRecords} types d'items`
          }
        />
      </Paper>

      {/* Modal de création/modification */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          form.reset();
          setEditingItemType(null);
        }}
        title={editingItemType ? 'Modifier le type d\'item' : 'Créer un type d\'item'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nom"
              placeholder="Nom du type d'item"
              required
              {...form.getInputProps('name')}
            />
            <Textarea
              label="Description"
              placeholder="Description du type d'item (optionnel)"
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
                  setEditingItemType(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingItemType ? 'Modifier' : 'Créer'}
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
          setItemTypeToDelete(null);
        }}
        title="Confirmer la suppression"
        size="md"
      >
        <Stack>
          <p>
            Êtes-vous sûr de vouloir supprimer le type d'item{' '}
            <strong>{itemTypeToDelete?.name}</strong> ?
            {itemTypeToDelete && (itemTypeToDelete.items.length > 0 || itemTypeToDelete.shops.length > 0) && (
              <span style={{ color: 'red', display: 'block', marginTop: '8px' }}>
                Attention : Ce type d'item contient {itemTypeToDelete.items.length} item(s) et {itemTypeToDelete.shops.length} magasin(s).
              </span>
            )}
          </p>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpened(false);
                setItemTypeToDelete(null);
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


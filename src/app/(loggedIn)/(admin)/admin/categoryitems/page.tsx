'use client';

import { useEffect, useState } from 'react';
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
  Badge,
  Text,
  Flex,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconPlus, IconX } from '@tabler/icons-react';
import {
  createCategoryItem,
  getCategoryItems,
  updateCategoryItem,
  deleteCategoryItem,
} from '@/app/_actions/categoryItems';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { CategoryItem } from '@prisma/client';

interface CategoryItemWithItems extends CategoryItem {
  items: { id: string; name: string }[];
}

export default function CategoryItemsPage() {
  const [categoryItems, setCategoryItems] = useState<CategoryItemWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingCategoryItem, setEditingCategoryItem] = useState<CategoryItemWithItems | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [categoryItemToDelete, setCategoryItemToDelete] = useState<CategoryItemWithItems | null>(null);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const form = useForm({
    initialValues: {
      name: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  const loadCategoryItems = async () => {
    try {
      setLoading(true);
      const result = await getCategoryItems();
      const data = handleAction(result);
      if (data) {
        setCategoryItems(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des catégories d\'items',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategoryItems();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingCategoryItem) {
        result = await updateCategoryItem({
          id: editingCategoryItem.id,
          name: values.name,
        });
      } else {
        result = await createCategoryItem({
          name: values.name,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingCategoryItem
          ? 'Catégorie d\'item modifiée avec succès'
          : 'Catégorie d\'item créée avec succès',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingCategoryItem(null);
      loadCategoryItems();
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

  const handleEdit = (categoryItem: CategoryItemWithItems) => {
    setEditingCategoryItem(categoryItem);
    form.setValues({
      name: categoryItem.name,
    });
    setModalOpened(true);
  };

  const handleDelete = async () => {
    if (!categoryItemToDelete) return;

    try {
      const result = await deleteCategoryItem({ id: categoryItemToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Catégorie d\'item supprimée avec succès',
        color: 'green',
      });
      setDeleteModalOpened(false);
      setCategoryItemToDelete(null);
      loadCategoryItems();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  const openCreateModal = () => {
    setEditingCategoryItem(null);
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

  // Filtrer les catégories d'items par nom
  const filteredCategoryItems = categoryItems.filter((categoryItem) => {
    const matchesName = !nameFilter || 
      normalizeString(categoryItem.name).includes(normalizeString(nameFilter));
    return matchesName;
  });

  // Trier par nom
  const sortedCategoryItems = [...filteredCategoryItems].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );

  // Calculer la pagination
  const totalRecords = sortedCategoryItems.length;
  const paginatedCategoryItems = sortedCategoryItems.slice(
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
        <Title order={1}>Catégories d'items</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer une catégorie d'item
        </Button>
      </Group>

      {/* Affichage des filtres actifs */}
      {nameFilter && (
        <Paper shadow="sm" p="md" withBorder mb="md">
          <Flex align="center" gap="md" wrap="wrap">
            <Text fw={500}>Filtres :</Text>
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
          </Flex>
        </Paper>
      )}

      <Paper shadow="sm" p="md" withBorder>
        <DataTable
          records={paginatedCategoryItems}
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
              accessor: 'items.length',
              title: "Nombre d'items",
              render: (categoryItem: CategoryItemWithItems) => categoryItem.items.length,
            },
            {
              accessor: 'actions',
              title: 'Actions',
              render: (categoryItem: CategoryItemWithItems) => (
                <Group gap="xs" wrap="nowrap">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => handleEdit(categoryItem)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => {
                      setCategoryItemToDelete(categoryItem);
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
            nameFilter
              ? 'Aucune catégorie d\'item trouvée avec ces filtres'
              : 'Aucune catégorie d\'item trouvée'
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
            `${from} - ${to} sur ${totalRecords} catégories d'items`
          }
        />
      </Paper>

      {/* Modal de création/modification */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          form.reset();
          setEditingCategoryItem(null);
        }}
        title={editingCategoryItem ? 'Modifier la catégorie d\'item' : 'Créer une catégorie d\'item'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nom"
              placeholder="Nom de la catégorie d'item"
              required
              {...form.getInputProps('name')}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setModalOpened(false);
                  form.reset();
                  setEditingCategoryItem(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingCategoryItem ? 'Modifier' : 'Créer'}
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
          setCategoryItemToDelete(null);
        }}
        title="Confirmer la suppression"
        size="md"
      >
        <Stack>
          <p>
            Êtes-vous sûr de vouloir supprimer la catégorie d'item{' '}
            <strong>{categoryItemToDelete?.name}</strong> ?
            {categoryItemToDelete && categoryItemToDelete.items.length > 0 && (
              <span style={{ color: 'red', display: 'block', marginTop: '8px' }}>
                Attention : Cette catégorie contient {categoryItemToDelete.items.length} item(s).
              </span>
            )}
          </p>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpened(false);
                setCategoryItemToDelete(null);
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


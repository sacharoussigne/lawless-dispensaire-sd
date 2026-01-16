'use client';

import { useEffect, useState, Suspense } from 'react';
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
  Select,
  Badge,
  Text,
  Flex,
  NumberInput,
  Switch,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconPlus, IconX } from '@tabler/icons-react';
import { createItem, getItems, updateItem, deleteItem } from '@/app/_actions/items';
import { getCategoryItems } from '@/app/_actions/categoryItems';
import { getCompanyGroups } from '@/app/_actions/companyGroups';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { Item, CategoryItem, CompanyGroup } from '@prisma/client';

interface ItemWithRelations extends Item {
  category: { id: string; name: string; color: string } | null;
  companyGroup: { id: string; name: string } | null;
}

function ItemsPageContent() {
  const [items, setItems] = useState<ItemWithRelations[]>([]);
  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([]);
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemWithRelations | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [companyGroupFilter, setCompanyGroupFilter] = useState<string | null>(null);
  const [craftableFilter, setCraftableFilter] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [descriptionFilter, setDescriptionFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      idealQuantity: 0,
      isCraftable: false,
      categoryId: '',
      companyGroupId: '',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      idealQuantity: (value) => (value < 0 ? 'La quantité idéale doit être positive' : null),
      categoryId: (value) => (!value ? 'La catégorie est requise' : null),
    },
  });

  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await getItems();
      const data = handleAction(result);
      if (data) {
        setItems(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des items',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryItems = async () => {
    try {
      const result = await getCategoryItems();
      const data = handleAction(result);
      if (data) {
        setCategoryItems(data);
      }
    } catch (error: any) {
      // Silently fail, categoryItems are optional
    }
  };

  const loadCompanyGroups = async () => {
    try {
      const result = await getCompanyGroups();
      const data = handleAction(result);
      if (data) {
        setCompanyGroups(data);
      }
    } catch (error: any) {
      // Silently fail, companyGroups are optional
    }
  };

  useEffect(() => {
    loadItems();
    loadCategoryItems();
    loadCompanyGroups();
  }, []);

  // Réinitialiser companyGroupId si isCraftable devient true
  useEffect(() => {
    if (form.values.isCraftable && form.values.companyGroupId) {
      form.setFieldValue('companyGroupId', '');
    }
  }, [form.values.isCraftable]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      // Si l'item est craftable, on force companyGroupId à null
      const companyGroupId = values.isCraftable ? undefined : (values.companyGroupId || undefined);

      if (editingItem) {
        result = await updateItem({
          id: editingItem.id,
          name: values.name,
          description: values.description || undefined,
          idealQuantity: values.idealQuantity,
          isCraftable: values.isCraftable,
          categoryId: values.categoryId,
          companyGroupId,
        });
      } else {
        result = await createItem({
          name: values.name,
          description: values.description || undefined,
          idealQuantity: values.idealQuantity,
          isCraftable: values.isCraftable,
          categoryId: values.categoryId,
          companyGroupId,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingItem
          ? 'Item modifié avec succès'
          : 'Item créé avec succès',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingItem(null);
      loadItems();
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

  const handleEdit = (item: ItemWithRelations) => {
    setEditingItem(item);
    form.setValues({
      name: item.name,
      description: item.description || '',
      idealQuantity: item.idealQuantity,
      isCraftable: item.isCraftable,
      categoryId: item.categoryId || '',
      companyGroupId: item.companyGroupId || '',
    });
    setModalOpened(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const result = await deleteItem({ id: itemToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Item supprimé avec succès',
        color: 'green',
      });
      setDeleteModalOpened(false);
      setItemToDelete(null);
      loadItems();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
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

  // Fonction pour calculer la luminosité d'une couleur hexadécimale
  const getLuminance = (hex: string): number => {
    // Convertir hex en RGB
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    // Appliquer la formule de luminance relative
    const [rs, gs, bs] = [r, g, b].map((val) => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // Fonction pour déterminer si le texte doit être blanc ou noir selon la couleur de fond
  const getTextColor = (backgroundColor: string): string => {
    const luminance = getLuminance(backgroundColor);
    // Si la luminosité est supérieure à 0.5, utiliser du texte noir, sinon du blanc
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  const categoryOptions = [...categoryItems]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    .map((category) => ({
      value: category.id,
      label: category.name,
    }));

  const companyGroupOptions = [...companyGroups]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    .map((group) => ({
      value: group.id,
      label: group.name,
    }));

  // Filtrer les items
  const filteredItems = items.filter((item) => {
    const matchesName = !nameFilter || 
      normalizeString(item.name).includes(normalizeString(nameFilter));
    const matchesDescription = !descriptionFilter || 
      (item.description && 
       normalizeString(item.description).includes(normalizeString(descriptionFilter)));
    const matchesCategory = !categoryFilter || item.categoryId === categoryFilter;
    const matchesCompanyGroup = !companyGroupFilter || item.companyGroupId === companyGroupFilter;
    const matchesCraftable = craftableFilter === null || 
      (craftableFilter === 'true' && item.isCraftable) ||
      (craftableFilter === 'false' && !item.isCraftable);
    return matchesName && matchesDescription && matchesCategory && matchesCompanyGroup && matchesCraftable;
  });

  // Trier par nom
  const sortedItems = [...filteredItems].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );

  // Calculer la pagination
  const totalRecords = sortedItems.length;
  const paginatedItems = sortedItems.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
  }, [categoryFilter, companyGroupFilter, craftableFilter, nameFilter, descriptionFilter]);

  const categoryFilterOptions = [
    { value: '', label: 'Toutes les catégories' },
    ...categoryOptions,
  ];

  const companyGroupFilterOptions = [
    { value: '', label: 'Tous les groupes d\'entreprises' },
    ...companyGroupOptions,
  ];

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Items</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer un item
        </Button>
      </Group>

      {/* Affichage des filtres actifs */}
      {(categoryFilter || companyGroupFilter || craftableFilter || nameFilter || descriptionFilter) && (
        <Paper shadow="sm" p="md" withBorder mb="md">
          <Flex align="center" gap="md" wrap="wrap">
            <Text fw={500}>Filtres :</Text>
            {categoryFilter && (
              <Badge
                variant="light"
                size="lg"
                rightSection={
                  <ActionIcon
                    size="xs"
                    color="blue"
                    radius="xl"
                    variant="transparent"
                    onClick={() => setCategoryFilter(null)}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                }
              >
                Catégorie: {categoryItems.find((c) => c.id === categoryFilter)?.name || 'Inconnu'}
              </Badge>
            )}
            {companyGroupFilter && (
              <Badge
                variant="light"
                size="lg"
                rightSection={
                  <ActionIcon
                    size="xs"
                    color="blue"
                    radius="xl"
                    variant="transparent"
                    onClick={() => setCompanyGroupFilter(null)}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                }
              >
                Groupe: {companyGroups.find((g) => g.id === companyGroupFilter)?.name || 'Inconnu'}
              </Badge>
            )}
            {craftableFilter && (
              <Badge
                variant="light"
                size="lg"
                rightSection={
                  <ActionIcon
                    size="xs"
                    color="blue"
                    radius="xl"
                    variant="transparent"
                    onClick={() => setCraftableFilter(null)}
                  >
                    <IconX size={12} />
                  </ActionIcon>
                }
              >
                Craftable: {craftableFilter === 'true' ? 'Oui' : 'Non'}
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
          records={paginatedItems}
          columns={[
            {
              accessor: 'category.name',
              title: 'Catégorie',
              render: (item: ItemWithRelations) => {
                if (!item.category) return '-';
                const textColor = getTextColor(item.category.color);
                return (
                  <Badge
                    style={{
                      backgroundColor: item.category.color,
                      color: textColor,
                    }}
                    variant="filled"
                  >
                    {item.category.name}
                  </Badge>
                );
              },
              filter: (
                <Select
                  placeholder="Toutes les catégories"
                  data={categoryFilterOptions}
                  value={categoryFilter || ''}
                  onChange={(value) => setCategoryFilter(value || null)}
                  clearable
                  style={{ minWidth: 200 }}
                />
              ),
            },
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
              render: (item: ItemWithRelations) => item.description || '-',
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
              accessor: 'idealQuantity',
              title: 'Quantité idéale',
              render: (item: ItemWithRelations) => item.idealQuantity,
            },
            {
              accessor: 'isCraftable',
              title: 'Craftable',
              render: (item: ItemWithRelations) => (
                item.isCraftable ? (
                  <Badge color="green" variant="light">Oui</Badge>
                ) : (
                  <Badge color="gray" variant="light">Non</Badge>
                )
              ),
              filter: (
                <Select
                  placeholder="Tous"
                  data={[
                    { value: '', label: 'Tous' },
                    { value: 'true', label: 'Oui' },
                    { value: 'false', label: 'Non' },
                  ]}
                  value={craftableFilter || ''}
                  onChange={(value) => setCraftableFilter(value || null)}
                  clearable
                  style={{ minWidth: 150 }}
                />
              ),
            },
            {
              accessor: 'companyGroup.name',
              title: 'Groupe d\'entreprises',
              render: (item: ItemWithRelations) => item.companyGroup?.name || '-',
              filter: (
                <Select
                  placeholder="Tous les groupes"
                  data={companyGroupFilterOptions}
                  value={companyGroupFilter || ''}
                  onChange={(value) => setCompanyGroupFilter(value || null)}
                  clearable
                  style={{ minWidth: 200 }}
                />
              ),
            },
            {
              accessor: 'actions',
              title: 'Actions',
              render: (item: ItemWithRelations) => (
                <Group gap="xs" wrap="nowrap">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => handleEdit(item)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => {
                      setItemToDelete(item);
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
            categoryFilter || companyGroupFilter || craftableFilter || nameFilter || descriptionFilter
              ? 'Aucun item trouvé avec ces filtres'
              : 'Aucun item trouvé'
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
            `${from} - ${to} sur ${totalRecords} items`
          }
        />
      </Paper>

      {/* Modal de création/modification */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          form.reset();
          setEditingItem(null);
        }}
        title={editingItem ? 'Modifier l\'item' : 'Créer un item'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nom"
              placeholder="Nom de l'item"
              required
              {...form.getInputProps('name')}
            />
            <Textarea
              label="Description"
              placeholder="Description de l'item (optionnel)"
              rows={4}
              {...form.getInputProps('description')}
            />
            <NumberInput
              label="Quantité idéale"
              placeholder="Quantité idéale"
              required
              min={0}
              {...form.getInputProps('idealQuantity')}
            />
            <Select
              label="Catégorie"
              placeholder="Sélectionner une catégorie"
              data={categoryOptions}
              required
              searchable
              {...form.getInputProps('categoryId')}
            />
            <Switch
              label="Craftable"
              {...form.getInputProps('isCraftable', { type: 'checkbox' })}
            />
            {!form.values.isCraftable && (
              <Select
                label="Groupe d'entreprises"
                placeholder="Sélectionner un groupe d'entreprises (optionnel)"
                data={companyGroupOptions}
                clearable
                searchable
                {...form.getInputProps('companyGroupId')}
              />
            )}
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setModalOpened(false);
                  form.reset();
                  setEditingItem(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingItem ? 'Modifier' : 'Créer'}
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
          setItemToDelete(null);
        }}
        title="Confirmer la suppression"
        size="md"
      >
        <Stack>
          <p>
            Êtes-vous sûr de vouloir supprimer l'item{' '}
            <strong>{itemToDelete?.name}</strong> ?
          </p>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpened(false);
                setItemToDelete(null);
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

export default function ItemsPage() {
  return (
    <Suspense fallback={
      <Container size="xl" py="xl">
        <div>Chargement...</div>
      </Container>
    }>
      <ItemsPageContent />
    </Suspense>
  );
}


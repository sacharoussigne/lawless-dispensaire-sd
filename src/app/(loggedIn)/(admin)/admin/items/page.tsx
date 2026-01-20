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
  Table,
  Divider,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconEdit,
  IconTrash,
  IconPlus,
  IconX,
  IconTools,
  IconGripVertical,
} from '@tabler/icons-react';
import {
  createItem,
  getItems,
  updateItem,
  deleteItem,
  reorderItems,
} from '@/app/_actions/items';
import { getCategoryItems } from '@/app/_actions/categoryItems';
import { getCompanyGroups } from '@/app/_actions/companyGroups';
import {
  getCraftRecipesByItemId,
  createCraftRecipe,
  updateCraftRecipe,
  deleteCraftRecipe,
} from '@/app/_actions/craftRecipes';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type {
  Item,
  CategoryItem,
  CompanyGroup,
  CraftRecipe,
  CraftRecipeItem,
} from '@prisma/client';

interface ItemWithRelations extends Item {
  category: { id: string; name: string; color: string; order?: number } | null;
  companyGroup: { id: string; name: string } | null;
}

interface CraftRecipeItemWithItem extends CraftRecipeItem {
  usedItem: { id: string; name: string };
}

interface CraftRecipeWithIngredients extends CraftRecipe {
  ingredients: CraftRecipeItemWithItem[];
}

function ItemsPageContent() {
  const [items, setItems] = useState<ItemWithRelations[]>([]);
  const [categoryItems, setCategoryItems] = useState<CategoryItem[]>([]);
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithRelations | null>(
    null
  );
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemWithRelations | null>(
    null
  );
  const [craftRecipesModalOpened, setCraftRecipesModalOpened] = useState(false);
  const [selectedItemForCraft, setSelectedItemForCraft] =
    useState<ItemWithRelations | null>(null);
  const [craftRecipes, setCraftRecipes] = useState<
    CraftRecipeWithIngredients[]
  >([]);
  const [loadingCraftRecipes, setLoadingCraftRecipes] = useState(false);
  const [craftRecipeModalOpened, setCraftRecipeModalOpened] = useState(false);
  const [editingCraftRecipe, setEditingCraftRecipe] =
    useState<CraftRecipeWithIngredients | null>(null);
  const [deleteCraftRecipeModalOpened, setDeleteCraftRecipeModalOpened] =
    useState(false);
  const [craftRecipeToDelete, setCraftRecipeToDelete] =
    useState<CraftRecipeWithIngredients | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [companyGroupFilter, setCompanyGroupFilter] = useState<string | null>(
    null
  );
  const [craftableFilter, setCraftableFilter] = useState<string | null>(null);
  const [reorderModalOpened, setReorderModalOpened] = useState(false);
  const [selectedCategoryForReorder, setSelectedCategoryForReorder] = useState<string | null>(null);
  const [reorderItemsList, setReorderItemsList] = useState<ItemWithRelations[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  
  // Sensors pour le drag & drop dans la modal
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      idealQuantity: (value) =>
        value < 0 ? 'La quantité idéale doit être positive' : null,
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
        message: error.message || 'Erreur lors du chargement des objets',
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
      const companyGroupId = values.isCraftable
        ? undefined
        : values.companyGroupId || undefined;

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
          ? 'Objet modifié avec succès'
          : 'Objet créé avec succès',
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
        message: 'Objet supprimé avec succès',
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

  const openReorderModal = () => {
    setSelectedCategoryForReorder(null);
    setReorderItemsList([]);
    setReorderModalOpened(true);
  };

  const handleCategorySelectForReorder = (categoryId: string) => {
    const categoryItems = items.filter((item) => item.categoryId === categoryId);
    setSelectedCategoryForReorder(categoryId);
    setReorderItemsList([...categoryItems].sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    }));
  };

  const handleSaveReorder = async () => {
    if (!selectedCategoryForReorder || reorderItemsList.length === 0) return;

    try {
      setSavingOrder(true);
      const result = await reorderItems({
        items: reorderItemsList.map((item, index) => ({
          id: item.id,
          order: index,
        })),
      });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Ordre des objets mis à jour',
        color: 'green',
      });
      setReorderModalOpened(false);
      setSelectedCategoryForReorder(null);
      setReorderItemsList([]);
      loadItems();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la mise à jour de l\'ordre',
        color: 'red',
      });
    } finally {
      setSavingOrder(false);
    }
  };

  const handleReorderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setReorderItemsList((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const loadCraftRecipes = async (itemId: string) => {
    try {
      setLoadingCraftRecipes(true);
      const result = await getCraftRecipesByItemId(itemId);
      const data = handleAction(result);
      if (data) {
        setCraftRecipes(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message:
          error.message || 'Erreur lors du chargement des recettes de craft',
        color: 'red',
      });
    } finally {
      setLoadingCraftRecipes(false);
    }
  };

  const craftRecipeForm = useForm({
    initialValues: {
      name: '',
      description: '',
      quantity: 1,
      ingredients: [] as { usedItemId: string; quantity: number }[],
    },
    validate: {
      name: (value) =>
        value.length < 1 ? 'Le nom de la recette est requis' : null,
      quantity: (value) =>
        value < 1 ? 'La quantité doit être au moins 1' : null,
      ingredients: (value) =>
        value.length < 1 ? 'Au moins un ingrédient est requis' : null,
    },
  });

  const handleOpenCraftRecipeModal = (recipe?: CraftRecipeWithIngredients) => {
    if (recipe) {
      setEditingCraftRecipe(recipe);
      craftRecipeForm.setValues({
        name: recipe.name,
        description: recipe.description || '',
        quantity: recipe.quantity,
        ingredients: recipe.ingredients.map((ing) => ({
          usedItemId: ing.usedItemId,
          quantity: ing.quantity,
        })),
      });
    } else {
      setEditingCraftRecipe(null);
      craftRecipeForm.setValues({
        name: '',
        description: '',
        quantity: 1,
        ingredients: [],
      });
    }
    setCraftRecipeModalOpened(true);
  };

  const handleSubmitCraftRecipe = async (
    values: typeof craftRecipeForm.values
  ) => {
    if (!selectedItemForCraft) return;

    try {
      let result;
      if (editingCraftRecipe) {
        result = await updateCraftRecipe({
          id: editingCraftRecipe.id,
          name: values.name,
          description: values.description || undefined,
          quantity: values.quantity,
          ingredients: values.ingredients,
        });
      } else {
        result = await createCraftRecipe({
          name: values.name,
          description: values.description || undefined,
          craftedItemId: selectedItemForCraft.id,
          quantity: values.quantity,
          ingredients: values.ingredients,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingCraftRecipe
          ? 'Recette de craft modifiée avec succès'
          : 'Recette de craft créée avec succès',
        color: 'green',
      });
      setCraftRecipeModalOpened(false);
      craftRecipeForm.reset();
      setEditingCraftRecipe(null);
      if (selectedItemForCraft) {
        loadCraftRecipes(selectedItemForCraft.id);
      }
    } catch (error: any) {
      if (error instanceof ParsedZodError) {
        handleApiZodError(error.error, craftRecipeForm);
      } else {
        notifications.show({
          title: 'Erreur',
          message: error.message || 'Erreur lors de la sauvegarde',
          color: 'red',
        });
      }
    }
  };

  const handleDeleteCraftRecipe = async () => {
    if (!craftRecipeToDelete) return;

    try {
      const result = await deleteCraftRecipe({ id: craftRecipeToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Recette de craft supprimée avec succès',
        color: 'green',
      });
      setDeleteCraftRecipeModalOpened(false);
      setCraftRecipeToDelete(null);
      if (selectedItemForCraft) {
        loadCraftRecipes(selectedItemForCraft.id);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  const addIngredient = () => {
    craftRecipeForm.insertListItem('ingredients', {
      usedItemId: '',
      quantity: 1,
    });
  };

  const removeIngredient = (index: number) => {
    craftRecipeForm.removeListItem('ingredients', index);
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
      return val <= 0.03928
        ? val / 12.92
        : Math.pow((val + 0.055) / 1.055, 2.4);
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
    .sort((a, b) => {
      // Trier par order puis par nom
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    })
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
    const matchesName =
      !nameFilter ||
      normalizeString(item.name).includes(normalizeString(nameFilter));
    const matchesDescription =
      !descriptionFilter ||
      (item.description &&
        normalizeString(item.description).includes(
          normalizeString(descriptionFilter)
        ));
    const matchesCategory =
      !categoryFilter || item.categoryId === categoryFilter;
    const matchesCompanyGroup =
      !companyGroupFilter || item.companyGroupId === companyGroupFilter;
    const matchesCraftable =
      craftableFilter === null ||
      (craftableFilter === 'true' && item.isCraftable) ||
      (craftableFilter === 'false' && !item.isCraftable);
    return (
      matchesName &&
      matchesDescription &&
      matchesCategory &&
      matchesCompanyGroup &&
      matchesCraftable
    );
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
  }, [
    categoryFilter,
    companyGroupFilter,
    craftableFilter,
    nameFilter,
    descriptionFilter,
  ]);

  const categoryFilterOptions = [
    { value: '', label: 'Toutes les catégories' },
    ...categoryOptions,
  ];

  const companyGroupFilterOptions = [
    { value: '', label: "Tous les groupes d'entreprises" },
    ...companyGroupOptions,
  ];

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Objets</Title>
        <Group>
          <Button
            variant="light"
            onClick={openReorderModal}
            disabled={items.length === 0}
          >
            Réordonner
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Créer un objet
          </Button>
        </Group>
      </Group>

      {/* Affichage des filtres actifs */}
      {(categoryFilter ||
        companyGroupFilter ||
        craftableFilter ||
        nameFilter ||
        descriptionFilter) && (
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
                Catégorie:{' '}
                {categoryItems.find((c) => c.id === categoryFilter)?.name ||
                  'Inconnu'}
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
                Groupe:{' '}
                {companyGroups.find((g) => g.id === companyGroupFilter)?.name ||
                  'Inconnu'}
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
              render: (item: ItemWithRelations) =>
                item.isCraftable ? (
                  <Badge
                    color="green"
                    variant="light"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedItemForCraft(item);
                      setCraftRecipesModalOpened(true);
                      loadCraftRecipes(item.id);
                    }}
                  >
                    Oui
                  </Badge>
                ) : (
                  <Badge color="gray" variant="light">
                    Non
                  </Badge>
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
              title: "Groupe d'entreprises",
              render: (item: ItemWithRelations) =>
                item.companyGroup?.name || '-',
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
                <Group gap="xs" wrap="nowrap" justify="flex-end">
                  {item.isCraftable && (
                    <ActionIcon
                      variant="light"
                      color="orange"
                      onClick={() => {
                        setSelectedItemForCraft(item);
                        setCraftRecipesModalOpened(true);
                        loadCraftRecipes(item.id);
                      }}
                      title="Gérer les recettes de craft"
                    >
                      <IconTools size={16} />
                    </ActionIcon>
                  )}
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
            categoryFilter ||
            companyGroupFilter ||
            craftableFilter ||
            nameFilter ||
            descriptionFilter
              ? 'Aucun objet trouvé avec ces filtres'
              : 'Aucun objet trouvé'
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
            `${from} - ${to} sur ${totalRecords} objets`
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
        title={editingItem ? "Modifier l'objet" : 'Créer un objet'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nom"
              placeholder="Nom de l'objet"
              required
              {...form.getInputProps('name')}
            />
            <Textarea
              label="Description"
              placeholder="Description de l'objet (optionnel)"
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
              label="Peut être crafté"
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
            Êtes-vous sûr de vouloir supprimer l'objet{' '}
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

      {/* Modal de gestion des recettes de craft */}
      <Modal
        opened={craftRecipesModalOpened}
        onClose={() => {
          setCraftRecipesModalOpened(false);
          setSelectedItemForCraft(null);
          setCraftRecipes([]);
        }}
        title={`Recettes de craft - ${selectedItemForCraft?.name}`}
        size="xl"
      >
        <Stack>
          <Group justify="space-between">
            <Text>Liste des recettes de craft pour cet objet</Text>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => handleOpenCraftRecipeModal()}
            >
              Ajouter une recette
            </Button>
          </Group>

          {loadingCraftRecipes ? (
            <Text>Chargement...</Text>
          ) : craftRecipes.length === 0 ? (
            <Text c="dimmed">Aucune recette de craft pour cet objet</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nom</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Quantité produite</Table.Th>
                  <Table.Th>Ingrédients</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {craftRecipes.map((recipe) => (
                  <Table.Tr key={recipe.id}>
                    <Table.Td>{recipe.name}</Table.Td>
                    <Table.Td>{recipe.description || '-'}</Table.Td>
                    <Table.Td>{recipe.quantity}</Table.Td>
                    <Table.Td>
                      <Stack gap="xs">
                        {recipe.ingredients.map((ing, idx) => (
                          <Text key={idx} size="sm">
                            {ing.quantity}x {ing.usedItem.name}
                          </Text>
                        ))}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleOpenCraftRecipeModal(recipe)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => {
                            setCraftRecipeToDelete(recipe);
                            setDeleteCraftRecipeModalOpened(true);
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Modal>

      {/* Modal de création/modification de recette de craft */}
      <Modal
        opened={craftRecipeModalOpened}
        onClose={() => {
          setCraftRecipeModalOpened(false);
          craftRecipeForm.reset();
          setEditingCraftRecipe(null);
        }}
        title={
          editingCraftRecipe
            ? 'Modifier la recette de craft'
            : 'Créer une recette de craft'
        }
        size="lg"
      >
        <form onSubmit={craftRecipeForm.onSubmit(handleSubmitCraftRecipe)}>
          <Stack>
            <TextInput
              label="Nom de la recette"
              placeholder="Nom de la recette"
              required
              {...craftRecipeForm.getInputProps('name')}
            />
            <Textarea
              label="Description"
              placeholder="Description de la recette (optionnel)"
              rows={3}
              {...craftRecipeForm.getInputProps('description')}
            />
            <NumberInput
              label="Quantité produite"
              placeholder="Quantité produite"
              required
              min={1}
              {...craftRecipeForm.getInputProps('quantity')}
            />
            <Divider label="Ingrédients" labelPosition="left" />
            {craftRecipeForm.values.ingredients.map((ingredient, index) => (
              <Group key={index} align="flex-end" gap="xs">
                <Select
                  label={`Ingrédient ${index + 1}`}
                  placeholder="Sélectionner un objet"
                  data={items
                    .filter((item) => item.id !== selectedItemForCraft?.id)
                    .sort((a, b) => {
                      // Trier par order puis par nom
                      if (a.order !== undefined && b.order !== undefined) {
                        return a.order - b.order;
                      }
                      if (a.order !== undefined) return -1;
                      if (b.order !== undefined) return 1;
                      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
                    })
                    .map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                  required
                  searchable
                  style={{ flex: 1 }}
                  {...craftRecipeForm.getInputProps(
                    `ingredients.${index}.usedItemId`
                  )}
                />
                <NumberInput
                  label="Quantité"
                  placeholder="Qty"
                  required
                  min={1}
                  style={{ width: 120 }}
                  {...craftRecipeForm.getInputProps(
                    `ingredients.${index}.quantity`
                  )}
                />
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={() => removeIngredient(index)}
                  disabled={craftRecipeForm.values.ingredients.length === 1}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            ))}
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={addIngredient}
            >
              Ajouter un ingrédient
            </Button>
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setCraftRecipeModalOpened(false);
                  craftRecipeForm.reset();
                  setEditingCraftRecipe(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingCraftRecipe ? 'Modifier' : 'Créer'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Modal de confirmation de suppression de recette de craft */}
      <Modal
        opened={deleteCraftRecipeModalOpened}
        onClose={() => {
          setDeleteCraftRecipeModalOpened(false);
          setCraftRecipeToDelete(null);
        }}
        title="Confirmer la suppression"
        size="md"
      >
        <Stack>
          <p>
            Êtes-vous sûr de vouloir supprimer la recette de craft{' '}
            <strong>{craftRecipeToDelete?.name}</strong> ?
          </p>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteCraftRecipeModalOpened(false);
                setCraftRecipeToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button color="red" onClick={handleDeleteCraftRecipe}>
              Supprimer
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de réordonnancement */}
      <Modal
        opened={reorderModalOpened}
        onClose={() => {
          setReorderModalOpened(false);
          setSelectedCategoryForReorder(null);
          setReorderItemsList([]);
        }}
        title="Réordonner les objets"
        size="md"
      >
        <Stack>
          {!selectedCategoryForReorder ? (
            <>
              <Text size="sm" c="dimmed" mb="md">
                Sélectionnez une catégorie pour réordonner ses objets
              </Text>
              <Select
                label="Catégorie"
                placeholder="Choisir une catégorie"
                data={categoryOptions}
                searchable
                onChange={(value) => {
                  if (value) {
                    handleCategorySelectForReorder(value);
                  }
                }}
              />
            </>
          ) : (
            <>
              <Group justify="space-between" mb="md">
                <Text fw={500}>
                  {categoryItems.find((c) => c.id === selectedCategoryForReorder)?.name || 'Catégorie'}
                </Text>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setSelectedCategoryForReorder(null);
                    setReorderItemsList([]);
                  }}
                >
                  Changer de catégorie
                </Button>
              </Group>
              <Text size="sm" c="dimmed" mb="md">
                Glissez-déposez les objets pour les réordonner
              </Text>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleReorderDragEnd}
              >
                <SortableContext
                  items={reorderItemsList.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <Stack gap="xs">
                    {reorderItemsList.map((item) => (
                      <SortableItemRow key={item.id} item={item} />
                    ))}
                  </Stack>
                </SortableContext>
              </DndContext>
              <Group justify="flex-end" mt="md">
                <Button
                  variant="subtle"
                  onClick={() => {
                    setReorderModalOpened(false);
                    setSelectedCategoryForReorder(null);
                    setReorderItemsList([]);
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSaveReorder}
                  loading={savingOrder}
                  disabled={reorderItemsList.length === 0}
                >
                  Valider
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Container>
  );
}

// Composant pour une ligne draggable dans la modal
function SortableItemRow({ item }: { item: ItemWithRelations }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '12px',
        marginBottom: '8px',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        backgroundColor: isDragging ? '#f8f9fa' : 'white',
        cursor: 'grab',
      }}
    >
      <Group gap="xs">
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            color: '#868e96',
          }}
        >
          <IconGripVertical size={20} />
        </div>
        <Text fw={500}>{item.name}</Text>
      </Group>
    </div>
  );
}

export default function ItemsPage() {
  return (
    <Suspense
      fallback={
        <Container size="xl" py="xl">
          <div>Chargement...</div>
        </Container>
      }
    >
      <ItemsPageContent />
    </Suspense>
  );
}

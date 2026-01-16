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
  ColorInput,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash, IconPlus, IconX, IconGripVertical } from '@tabler/icons-react';
import {
  createCategoryItem,
  getCategoryItems,
  updateCategoryItem,
  deleteCategoryItem,
  reorderCategoryItems,
} from '@/app/_actions/categoryItems';
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
  const [reorderModalOpened, setReorderModalOpened] = useState(false);
  const [reorderItems, setReorderItems] = useState<CategoryItemWithItems[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);

  // Sensors pour le drag & drop dans la modal
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const form = useForm({
    initialValues: {
      name: '',
      color: '#ffffff',
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
      color: (value) => (!value || value.length < 1 ? 'La couleur est requise' : null),
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
          color: values.color || '#ffffff',
        });
      } else {
        result = await createCategoryItem({
          name: values.name,
          color: values.color || '#ffffff',
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
      color: categoryItem.color || '#ffffff',
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

  const openReorderModal = () => {
    setReorderItems([...sortedCategoryItems]);
    setReorderModalOpened(true);
  };

  const handleSaveReorder = async () => {
    try {
      setSavingOrder(true);
      const result = await reorderCategoryItems({
        items: reorderItems.map((item, index) => ({
          id: item.id,
          order: index,
        })),
      });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Ordre des catégories mis à jour',
        color: 'green',
      });
      setReorderModalOpened(false);
      loadCategoryItems();
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
      setReorderItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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

  // Trier par ordre puis par nom
  const sortedCategoryItems = [...filteredCategoryItems].sort((a, b) => {
    // Si les deux ont un ordre, trier par ordre
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    // Sinon, trier par nom
    return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  });

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
        <Group>
          <Button
            variant="light"
            onClick={openReorderModal}
            disabled={categoryItems.length === 0}
          >
            Réordonner
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Créer une catégorie d'item
          </Button>
        </Group>
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
              accessor: 'color',
              title: 'Couleur',
              render: (categoryItem: CategoryItemWithItems) => (
                <Group gap="xs">
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      backgroundColor: categoryItem.color,
                      border: '1px solid #dee2e6',
                    }}
                  />
                  <Text size="sm">{categoryItem.color}</Text>
                </Group>
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
            <ColorInput
              label="Couleur"
              placeholder="Sélectionner une couleur"
              format="hex"
              required
              {...form.getInputProps('color')}
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

      {/* Modal de réordonnancement */}
      <Modal
        opened={reorderModalOpened}
        onClose={() => {
          setReorderModalOpened(false);
          setReorderItems([]);
        }}
        title="Réordonner les catégories"
        size="md"
      >
        <Stack>
          <Text size="sm" c="dimmed" mb="md">
            Glissez-déposez les catégories pour les réordonner
          </Text>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleReorderDragEnd}
          >
            <SortableContext
              items={reorderItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack gap="xs">
                {reorderItems.map((categoryItem) => (
                  <SortableRow key={categoryItem.id} categoryItem={categoryItem} />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setReorderModalOpened(false);
                setReorderItems([]);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveReorder}
              loading={savingOrder}
            >
              Valider
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

// Composant pour une ligne draggable dans la modal
function SortableRow({ categoryItem }: { categoryItem: CategoryItemWithItems }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoryItem.id });

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
        <Text fw={500}>{categoryItem.name}</Text>
      </Group>
    </div>
  );
}


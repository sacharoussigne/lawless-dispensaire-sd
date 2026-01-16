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
  createCompanyGroup,
  getCompanyGroups,
  updateCompanyGroup,
  deleteCompanyGroup,
} from '@/app/_actions/companyGroups';
import { getCompanies } from '@/app/_actions/companies';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { CompanyGroup, Company, Location } from '@prisma/client';

interface CompanyGroupWithRelations extends CompanyGroup {
  items: { id: string }[];
  companies: {
    id: string;
    companyId?: string;
    company: Company & {
      location: {
        id: string;
        name: string;
      };
    };
  }[];
}

interface CompanyWithRelations extends Company {
  location: { id: string; name: string };
  companyGroups: { id: string }[];
}

export default function CompanyGroupsPage() {
  const [companyGroups, setCompanyGroups] = useState<CompanyGroupWithRelations[]>([]);
  const [companies, setCompanies] = useState<CompanyWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingCompanyGroup, setEditingCompanyGroup] = useState<CompanyGroupWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [companyGroupToDelete, setCompanyGroupToDelete] = useState<CompanyGroupWithRelations | null>(null);
  const [nameFilter, setNameFilter] = useState<string>('');
  const [descriptionFilter, setDescriptionFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      companyIds: [] as string[],
    },
    validate: {
      name: (value) => (value.length < 1 ? 'Le nom est requis' : null),
    },
  });

  const loadCompanyGroups = async () => {
    try {
      setLoading(true);
      const result = await getCompanyGroups();
      const data = handleAction(result);
      if (data) {
        setCompanyGroups(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des groupes d\'entreprises',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const result = await getCompanies();
      const data = handleAction(result);
      if (data && Array.isArray(data)) {
        setCompanies(data);
      } else {
        setCompanies([]);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des entreprises:', error);
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des entreprises',
        color: 'red',
      });
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    loadCompanyGroups();
    loadCompanies();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      let result;
      if (editingCompanyGroup) {
        result = await updateCompanyGroup({
          id: editingCompanyGroup.id,
          name: values.name,
          description: values.description || undefined,
          companyIds: values.companyIds.length > 0 ? values.companyIds : undefined,
        });
      } else {
        result = await createCompanyGroup({
          name: values.name,
          description: values.description || undefined,
          companyIds: values.companyIds.length > 0 ? values.companyIds : undefined,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingCompanyGroup
          ? 'Groupe d\'entreprises modifié avec succès'
          : 'Groupe d\'entreprises créé avec succès',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingCompanyGroup(null);
      loadCompanyGroups();
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

  const handleEdit = (companyGroup: CompanyGroupWithRelations) => {
    setEditingCompanyGroup(companyGroup);
    form.setValues({
      name: companyGroup.name,
      description: companyGroup.description || '',
      companyIds: companyGroup.companies.map((c) => c.companyId || c.id),
    });
    setModalOpened(true);
  };

  const handleDelete = async () => {
    if (!companyGroupToDelete) return;

    try {
      const result = await deleteCompanyGroup({ id: companyGroupToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Groupe d\'entreprises supprimé avec succès',
        color: 'green',
      });
      setDeleteModalOpened(false);
      setCompanyGroupToDelete(null);
      loadCompanyGroups();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  const openCreateModal = () => {
    setEditingCompanyGroup(null);
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

  // Filtrer les groupes d'entreprises par nom et description
  const filteredCompanyGroups = companyGroups.filter((companyGroup) => {
    const matchesName = !nameFilter || 
      normalizeString(companyGroup.name).includes(normalizeString(nameFilter));
    const matchesDescription = !descriptionFilter || 
      (companyGroup.description && 
       normalizeString(companyGroup.description).includes(normalizeString(descriptionFilter)));
    return matchesName && matchesDescription;
  });

  // Trier par nom
  const sortedCompanyGroups = [...filteredCompanyGroups].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );

  // Calculer la pagination
  const totalRecords = sortedCompanyGroups.length;
  const paginatedCompanyGroups = sortedCompanyGroups.slice(
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
        <Title order={1}>Groupes d'entreprises</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer un groupe d'entreprises
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
          records={paginatedCompanyGroups}
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
              render: (companyGroup: CompanyGroupWithRelations) => companyGroup.description || '-',
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
              render: (companyGroup: CompanyGroupWithRelations) => companyGroup.items.length,
            },
            {
              accessor: 'companies',
              title: 'Entreprises',
              render: (companyGroup: CompanyGroupWithRelations) => (
                <Group gap="xs">
                  {companyGroup.companies.length === 0 ? (
                    <Text c="dimmed" size="sm">-</Text>
                  ) : (
                    companyGroup.companies.map((companyRelation) => {
                      const company = companyRelation.company;
                      if (!company) return null;
                      return (
                        <Badge key={companyRelation.id} variant="light" size="sm">
                          {company.name} - {company.location.name}
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
              render: (companyGroup: CompanyGroupWithRelations) => (
                <Group gap="xs" wrap="nowrap">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => handleEdit(companyGroup)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => {
                      setCompanyGroupToDelete(companyGroup);
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
              ? 'Aucun groupe d\'entreprises trouvé avec ces filtres'
              : 'Aucun groupe d\'entreprises trouvé'
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
            `${from} - ${to} sur ${totalRecords} groupes d'entreprises`
          }
        />
      </Paper>

      {/* Modal de création/modification */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          form.reset();
          setEditingCompanyGroup(null);
        }}
        title={editingCompanyGroup ? 'Modifier le groupe d\'entreprises' : 'Créer un groupe d\'entreprises'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nom"
              placeholder="Nom du groupe d'entreprises"
              required
              {...form.getInputProps('name')}
            />
            <Textarea
              label="Description"
              placeholder="Description du groupe d'entreprises (optionnel)"
              rows={4}
              {...form.getInputProps('description')}
            />
            <MultiSelect
              label="Entreprises"
              placeholder={loadingCompanies ? 'Chargement des entreprises...' : companies.length === 0 ? 'Aucune entreprise disponible' : 'Sélectionner des entreprises'}
              data={[...companies]
                .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
                .map((company) => ({
                  value: company.id,
                  label: `${company.name} - ${company.location.name}`,
                }))}
              value={form.values.companyIds}
              onChange={(value) => form.setFieldValue('companyIds', value)}
              error={form.errors.companyIds}
              searchable
              clearable
              disabled={loadingCompanies}
            />
            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => {
                  setModalOpened(false);
                  form.reset();
                  setEditingCompanyGroup(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingCompanyGroup ? 'Modifier' : 'Créer'}
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
          setCompanyGroupToDelete(null);
        }}
        title="Confirmer la suppression"
        size="md"
      >
        <Stack>
          <p>
            Êtes-vous sûr de vouloir supprimer le groupe d'entreprises{' '}
            <strong>{companyGroupToDelete?.name}</strong> ?
            {companyGroupToDelete && (companyGroupToDelete.items.length > 0 || companyGroupToDelete.companies.length > 0) && (
              <span style={{ color: 'red', display: 'block', marginTop: '8px' }}>
                Attention : Ce groupe d'entreprises contient {companyGroupToDelete.items.length} item(s) et {companyGroupToDelete.companies.length} entreprise(s).
              </span>
            )}
          </p>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpened(false);
                setCompanyGroupToDelete(null);
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


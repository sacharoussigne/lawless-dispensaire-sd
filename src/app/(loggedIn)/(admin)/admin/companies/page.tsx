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
import { createCompany, getCompanies, updateCompany, deleteCompany } from '@/app/_actions/companies';
import { getLocations } from '@/app/_actions/locations';
import { handleAction } from '@/lib/action';
import { handleApiZodError } from '@/lib/services/zod';
import { ParsedZodError } from '@/lib/errors/ParsedZodError';
import type { Company, Location } from '@prisma/client';

interface CompanyWithRelations extends Company {
  location: { id: string; name: string };
  companyGroups: { id: string }[];
}

function CompaniesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyWithRelations[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyWithRelations | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyWithRelations | null>(null);
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

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const result = await getCompanies();
      const data = handleAction(result);
      if (data) {
        setCompanies(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des entreprises',
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
    loadCompanies();
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
      if (editingCompany) {
        result = await updateCompany({
          id: editingCompany.id,
          name: values.name,
          locationId: values.locationId,
        });
      } else {
        result = await createCompany({
          name: values.name,
          locationId: values.locationId,
        });
      }

      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: editingCompany
          ? 'Entreprise modifiée avec succès'
          : 'Entreprise créée avec succès',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      setEditingCompany(null);
      loadCompanies();
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

  const handleEdit = (company: CompanyWithRelations) => {
    setEditingCompany(company);
    form.setValues({
      name: company.name,
      locationId: company.locationId,
    });
    setModalOpened(true);
  };

  const handleDelete = async () => {
    if (!companyToDelete) return;

    try {
      const result = await deleteCompany({ id: companyToDelete.id });
      handleAction(result);
      notifications.show({
        title: 'Succès',
        message: 'Entreprise supprimée avec succès',
        color: 'green',
      });
      setDeleteModalOpened(false);
      setCompanyToDelete(null);
      loadCompanies();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    }
  };

  const openCreateModal = () => {
    setEditingCompany(null);
    form.reset();
    setModalOpened(true);
  };

  const locationOptions = [...locations]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    .map((location) => ({
      value: location.id,
      label: location.name,
    }));

  // Filtrer les entreprises par location et nom
  const filteredCompanies = companies.filter((company) => {
    const matchesLocation = !locationFilter || company.locationId === locationFilter;
    const matchesName = !nameFilter || company.name.toLowerCase().includes(nameFilter.toLowerCase());
    return matchesLocation && matchesName;
  });

  // Trier par nom
  const sortedCompanies = [...filteredCompanies].sort((a, b) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
  );

  // Calculer la pagination
  const totalRecords = sortedCompanies.length;
  const paginatedCompanies = sortedCompanies.slice(
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
        <Title order={1}>Entreprises</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Créer une entreprise
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
          records={paginatedCompanies}
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
              accessor: 'companyGroups.length',
              title: "Nombre de groupes d'entreprises",
              render: (company: CompanyWithRelations) => company.companyGroups.length,
            },
            {
              accessor: 'actions',
              title: 'Actions',
              render: (company: CompanyWithRelations) => (
                <Group gap="xs">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => handleEdit(company)}
                  >
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => {
                      setCompanyToDelete(company);
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
              ? 'Aucune entreprise trouvée avec ces filtres'
              : 'Aucune entreprise trouvée'
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
            `${from} - ${to} sur ${totalRecords} entreprises`
          }
        />
      </Paper>

      {/* Modal de création/modification */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          form.reset();
          setEditingCompany(null);
        }}
        title={editingCompany ? 'Modifier l\'entreprise' : 'Créer une entreprise'}
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nom"
              placeholder="Nom de l'entreprise"
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
                  setEditingCompany(null);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingCompany ? 'Modifier' : 'Créer'}
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
          setCompanyToDelete(null);
        }}
        title="Confirmer la suppression"
        size="md"
      >
        <Stack>
          <p>
            Êtes-vous sûr de vouloir supprimer l'entreprise{' '}
            <strong>{companyToDelete?.name}</strong> ?
            {companyToDelete && companyToDelete.companyGroups.length > 0 && (
              <span style={{ color: 'red', display: 'block', marginTop: '8px' }}>
                Attention : Cette entreprise contient {companyToDelete.companyGroups.length} groupe(s) d'entreprises.
              </span>
            )}
          </p>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpened(false);
                setCompanyToDelete(null);
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

export default function CompaniesPage() {
  return (
    <Suspense fallback={
      <Container size="xl" py="xl">
        <div>Chargement...</div>
      </Container>
    }>
      <CompaniesPageContent />
    </Suspense>
  );
}


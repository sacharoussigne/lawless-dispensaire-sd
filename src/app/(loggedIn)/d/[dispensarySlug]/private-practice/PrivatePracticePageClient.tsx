'use client';

import { usePermissions } from '@/app/_contexts/PermissionsContext';
import { useEffect, useState, useMemo } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
  Paper,
  NumberInput,
  Select,
  ActionIcon,
  Text,
  Badge,
  Stack,
  Checkbox,
  Autocomplete,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { DateInput, DatesProvider } from '@mantine/dates';
import 'dayjs/locale/fr';
import {
  IconPlus,
  IconTrash,
  IconArrowDown,
  IconArrowUp,
  IconEdit,
  IconCheck,
  IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  getOrCreateWeek,
  getWeeks,
  createPatient,
  updatePatient,
  deletePatient,
  getIdentitySuggestions,
  addIdentitySuggestion,
  deleteIdentitySuggestion,
} from '@/app/_actions/privatePractice';
import { handleAction } from '@/lib/action';
import { format, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PrivatePracticeWeek, PrivatePracticePatient } from '@prisma/client';
import {
  PatientTypeEnum,
  getPatientTypeLabel,
  getPatientTypeColor,
  PatientTypeEnumValues,
} from '@/types/enum/patientType';
import { WeekNavigation } from '@/app/_components/WeekNavigation/WeekNavigation';
import { SuggestionAutocomplete } from '@/app/_components/SuggestionAutocomplete/SuggestionAutocomplete';
import { SummaryCards } from '@/app/_components/SummaryCards/SummaryCards';

type SerializedPrivatePracticeWeek = PrivatePracticeWeek & {
  patients: Array<Omit<PrivatePracticePatient, 'consultationPrice' | 'otherPrice' | 'amountForCashRegister'> & {
    consultationPrice: number;
    otherPrice: number;
    amountForCashRegister: number;
  }>;
};

interface PrivatePracticePageClientProps {
  initialWeek: SerializedPrivatePracticeWeek;
}

const getPatientTypeOptions = (existingTypes: string[] = []) => {
  const defaultOptions = PatientTypeEnumValues;

  const allTypes = Array.from(new Set([...defaultOptions, ...existingTypes]));

  return allTypes.map((type) => ({
    value: type,
    label: getPatientTypeLabel(type),
  }));
};

export default function PrivatePracticePageClient({
  initialWeek,
}: PrivatePracticePageClientProps) {
  const { dispensarySlug } = usePermissions();
  const [week, setWeek] = useState<SerializedPrivatePracticeWeek>(initialWeek);
  const [weeks, setWeeks] = useState<SerializedPrivatePracticeWeek[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekDateValue, setWeekDateValue] = useState<Date | null>(new Date(initialWeek.weekStart));
  const [editingPatient, setEditingPatient] = useState<string | null>(null);
  const [editingPatientData, setEditingPatientData] = useState<{
    date?: Date | string;
    type?: string;
    identity?: string;
    description?: string;
    consultationPrice?: number;
    otherPrice?: number;
    amountForCashRegister?: number;
    depositedInCashRegister?: boolean;
    retrievedFromCashRegister?: boolean;
    order?: number;
  } | null>(null);
  const [newPatient, setNewPatient] = useState<{
    date?: Date | string;
    type?: string;
    identity?: string;
    description?: string;
    consultationPrice?: number;
    otherPrice?: number;
    amountForCashRegister?: number;
    depositedInCashRegister?: boolean;
    retrievedFromCashRegister?: boolean;
    order?: number;
  } | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [amountForCashRegisterManuallyModified, setAmountForCashRegisterManuallyModified] = useState(false);
  const [identitySuggestions, setIdentitySuggestions] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterIdentity, setFilterIdentity] = useState<string | null>(null);

  const existingTypes = useMemo(() => {
    const types = new Set<string>();
    week.patients.forEach((p) => {
      if (p.type) types.add(p.type);
    });
    return Array.from(types);
  }, [week.patients]);

  const patientTypeOptions = useMemo(() => {
    return getPatientTypeOptions(existingTypes);
  }, [existingTypes]);

  const existingIdentities = useMemo(() => {
    const identities = new Set<string>();
    week.patients.forEach((p) => {
      if (p.identity && p.identity.trim()) {
        identities.add(p.identity.trim());
      }
    });
    return Array.from(identities).sort();
  }, [week.patients]);

  const identityFilterOptions = useMemo(() => {
    return existingIdentities.map((identity) => ({
      value: identity,
      label: identity,
    }));
  }, [existingIdentities]);

  useEffect(() => {
    loadWeeks();
    loadIdentitySuggestions();
  }, []);

  const loadIdentitySuggestions = async () => {
    try {
      const result = await getIdentitySuggestions(dispensarySlug!);
      const data = handleAction(result);
      if (data) {
        setIdentitySuggestions(data);
      }
    } catch (error) {
      // Error handled by handleAction
    }
  };

  const handleAddIdentitySuggestion = async (value: string) => {
    if (!value || value.trim().length === 0) return;

    try {
      const result = await addIdentitySuggestion(dispensarySlug!, { value });
      const data = handleAction(result);
      if (data) {
        setIdentitySuggestions([...identitySuggestions, data]);
        notifications.show({
          title: 'Succès',
          message: 'Suggestion ajoutée',
          color: 'green',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'ajout de la suggestion',
        color: 'red',
      });
    }
  };

  const handleDeleteIdentitySuggestion = async (value: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!value || value.trim().length === 0) return;

    try {
      const result = await deleteIdentitySuggestion(dispensarySlug!, { value });
      const data = handleAction(result);
      if (data) {
        setIdentitySuggestions(identitySuggestions.filter(s => s.toLowerCase() !== value.toLowerCase().trim()));
        notifications.show({
          title: 'Succès',
          message: 'Suggestion supprimée',
          color: 'green',
        });
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression de la suggestion',
        color: 'red',
      });
    }
  };

  const loadWeeks = async () => {
    try {
      const result = await getWeeks(dispensarySlug!);
      const data = handleAction(result);
      if (data) {
        setWeeks(data);
      }
    } catch (error) {
      // Error handled by handleAction
    }
  };

  const loadWeek = async (date: Date) => {
    try {
      setLoading(true);
      const result = await getOrCreateWeek(dispensarySlug!, date);
      const data = handleAction(result);
      if (data) {
        setWeek(data);
        setWeekDateValue(new Date(data.weekStart));
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement de la semaine',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    const newDate = subWeeks(week.weekStart, 1);
    loadWeek(newDate);
  };

  const handleNextWeek = () => {
    const newDate = addWeeks(week.weekStart, 1);
    loadWeek(newDate);
  };

  const handleWeekChange = async (date: Date | null) => {
    if (date) {
      await loadWeek(date);
    }
  };

  const filteredPatients = useMemo(() => {
    let filtered = [...week.patients];

    if (filterType) {
      filtered = filtered.filter((p) => p.type === filterType);
    }

    if (filterIdentity && filterIdentity.trim()) {
      const filterIdentityLower = filterIdentity.toLowerCase().trim();
      filtered = filtered.filter((p) => 
        p.identity.toLowerCase().includes(filterIdentityLower)
      );
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      dateA.setHours(0, 0, 0, 0);
      const dateATime = dateA.getTime();

      const dateB = new Date(b.date);
      dateB.setHours(0, 0, 0, 0);
      const dateBTime = dateB.getTime();

      if (dateATime !== dateBTime) {
        return sortOrder === 'asc' ? dateATime - dateBTime : dateBTime - dateATime;
      }

      return sortOrder === 'asc' ? a.order - b.order : b.order - a.order;
    });
  }, [week.patients, sortOrder, filterType, filterIdentity]);

  const dataTableRecords = useMemo(() => {
    const records = [...filteredPatients];

    if (newPatient) {
      const newRecord = {
        id: 'new-patient',
        isNew: true,
        date: newPatient.date || new Date(),
        type: newPatient.type || '',
        identity: newPatient.identity || '',
        description: newPatient.description || null,
        consultationPrice: newPatient.consultationPrice || 0,
        otherPrice: newPatient.otherPrice || 0,
        amountForCashRegister: newPatient.amountForCashRegister || 0,
        depositedInCashRegister: newPatient.depositedInCashRegister || false,
        retrievedFromCashRegister: newPatient.retrievedFromCashRegister || false,
        order: newPatient.order || 0,
      };

      if (sortOrder === 'desc') {
        records.unshift(newRecord as any);
      } else {
        records.push(newRecord as any);
      }
    }

    return records;
  }, [filteredPatients, newPatient, sortOrder]);

  const displayedRowCount = useMemo(() => {
    return dataTableRecords.length;
  }, [dataTableRecords]);

  const totalConsultation = useMemo(() => {
    return week.patients.reduce((sum, p) => sum + p.consultationPrice, 0);
  }, [week.patients]);

  const totalOther = useMemo(() => {
    return week.patients.reduce((sum, p) => sum + p.otherPrice, 0);
  }, [week.patients]);

  const totalAmountForCashRegister = useMemo(() => {
    return week.patients.reduce((sum, p) => sum + p.amountForCashRegister, 0);
  }, [week.patients]);

  const variation = useMemo(() => {
    return totalConsultation - totalOther - totalAmountForCashRegister;
  }, [totalConsultation, totalOther, totalAmountForCashRegister]);

  const handleSavePatient = async (patient: {
    id?: string;
    date?: Date | string;
    type?: string;
    identity?: string;
    description?: string | null;
    consultationPrice?: number;
    otherPrice?: number;
    amountForCashRegister?: number;
    depositedInCashRegister?: boolean;
    retrievedFromCashRegister?: boolean;
    order?: number;
  }) => {
    try {
      setLoading(true);
      if (patient.id) {
        const result = await updatePatient(dispensarySlug!, {
          id: patient.id,
          date: patient.date,
          type: patient.type,
          identity: patient.identity,
          description: patient.description || undefined,
          consultationPrice: patient.consultationPrice,
          otherPrice: patient.otherPrice,
          amountForCashRegister: patient.amountForCashRegister,
          depositedInCashRegister: patient.depositedInCashRegister,
          retrievedFromCashRegister: patient.retrievedFromCashRegister,
          order: patient.order,
        });
        const data = handleAction(result);
        if (data) {
          notifications.show({
            title: 'Succès',
            message: 'Patient mis à jour',
            color: 'green',
          });
          await loadWeek(week.weekStart);
          await loadWeeks();
          setEditingPatient(null);
          setAmountForCashRegisterManuallyModified(false);
        }
      } else {
        if (!patient.date || !patient.type || !patient.identity) {
          notifications.show({
            title: 'Erreur',
            message: 'Veuillez remplir tous les champs requis',
            color: 'red',
          });
          return;
        }

        const result = await createPatient(dispensarySlug!, {
          weekId: week.id,
          date: patient.date as Date | string,
          type: patient.type!,
          identity: patient.identity!,
          description: patient.description || undefined,
          consultationPrice: patient.consultationPrice || 0,
          otherPrice: patient.otherPrice || 0,
          amountForCashRegister: patient.amountForCashRegister || 0,
          depositedInCashRegister: patient.depositedInCashRegister || false,
          retrievedFromCashRegister: patient.retrievedFromCashRegister || false,
          order: patient.order || 0,
        });
        const data = handleAction(result);
        if (data) {
          notifications.show({
            title: 'Succès',
            message: 'Patient créé',
            color: 'green',
          });
          await loadWeek(week.weekStart);
          await loadWeeks();
          await loadIdentitySuggestions();
          setNewPatient(null);
          setAmountForCashRegisterManuallyModified(false);
        }
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la sauvegarde',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePatient = async (id: string) => {
    try {
      setLoading(true);
      const result = await deletePatient(dispensarySlug!, { id });
      const data = handleAction(result);
      if (data) {
        notifications.show({
          title: 'Succès',
          message: 'Patient supprimé',
          color: 'green',
        });
        await loadWeek(week.weekStart);
        await loadWeeks();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la suppression',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReorderPatient = async (patientId: string, direction: 'up' | 'down') => {
    try {
      setLoading(true);

      const patient = week.patients.find((p) => p.id === patientId);
      if (!patient) return;

      const patientDate = new Date(patient.date);
      patientDate.setHours(0, 0, 0, 0);

      const sameDatePatients = week.patients.filter((p) => {
        const pDate = new Date(p.date);
        pDate.setHours(0, 0, 0, 0);
        return pDate.getTime() === patientDate.getTime();
      });

      if (sameDatePatients.length < 2) {
        return;
      }

      const sortedSameDate = [...sameDatePatients].sort((a, b) => a.order - b.order);
      const currentIndex = sortedSameDate.findIndex((p) => p.id === patientId);

      const actualDirection = sortOrder === 'desc'
        ? (direction === 'up' ? 'down' : 'up')
        : direction;

      if (actualDirection === 'up' && currentIndex === 0) {
        return;
      }

      if (actualDirection === 'down' && currentIndex === sortedSameDate.length - 1) {
        return;
      }

      const targetIndex = actualDirection === 'up' ? currentIndex - 1 : currentIndex + 1;
      const targetPatient = sortedSameDate[targetIndex];
      const newOrder = targetPatient.order;

      const result = await updatePatient(dispensarySlug!, {
        id: patientId,
        order: newOrder,
      });
      const data = handleAction(result);
      if (data) {
        notifications.show({
          title: 'Succès',
          message: 'Ordre mis à jour',
          color: 'green',
        });
        await loadWeek(week.weekStart);
        await loadWeeks();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du réordonnancement',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <div>
            <Title order={2} mb={4}>Cabinet privé</Title>
            <Text size="sm" c="dimmed">Gestion des patients</Text>
          </div>
        </Group>

        <Paper shadow="sm" p="lg" withBorder radius="md">
          <Stack gap="lg">
            <WeekNavigation
              weekStart={week.weekStart}
              weekEnd={week.weekEnd}
              weekDateValue={weekDateValue}
              onWeekChange={handleWeekChange}
              onPreviousWeek={handlePreviousWeek}
              onNextWeek={handleNextWeek}
              loading={loading}
            />

            <SummaryCards
              cards={[
                {
                  label: 'Total consultations',
                  value: totalConsultation,
                },
                {
                  label: 'Total autres ventes',
                  value: totalOther,
                },
                {
                  label: 'Total % Dispensaire',
                  value: totalAmountForCashRegister,
                },
                {
                  label: 'Variation',
                  value: variation,
                  color: variation >= 0 ? 'green' : 'red',
                  backgroundColor:
                    variation >= 0
                      ? 'var(--mantine-color-green-0)'
                      : 'var(--mantine-color-red-0)',
                  formatValue: (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)} $`,
                },
              ]}
            />
          </Stack>
        </Paper>

        <DatesProvider settings={{ locale: 'fr' }}>
          <Paper shadow="sm" withBorder radius="md" p={0}>
            {!newPatient && (
              <Group p="md" justify="flex-end">
                <Button
                  leftSection={<IconPlus size={18} />}
                  onClick={() => {
                    setAmountForCashRegisterManuallyModified(false);
                    setNewPatient({
                      date: new Date(),
                      type: PatientTypeEnum.CIVIL,
                      identity: '',
                      description: '',
                      consultationPrice: 0,
                      otherPrice: 0,
                      amountForCashRegister: 0,
                      depositedInCashRegister: false,
                      retrievedFromCashRegister: false,
                      order: week.patients.length,
                    });
                  }}
                  size="sm"
                  radius="md"
                >
                  Ajouter un patient
                </Button>
              </Group>
            )}
            <DataTable
              records={dataTableRecords}
              columns={[
                {
                  accessor: 'date',
                  title: 'Date',
                  sortable: true,
                  render: (patient: any) => {
                    const isNew = patient.isNew;
                    const isEditing = !isNew && editingPatient === patient.id;

                    if (isNew) {
                      return (
                        <DateInput
                          value={newPatient?.date ? new Date(newPatient.date) : new Date()}
                          onChange={(date) => {
                            if (date && newPatient) {
                              setNewPatient({ ...newPatient, date: date as any });
                            }
                          }}
                          size="xs"
                          valueFormat="DD/MM/YYYY"
                        />
                      );
                    }

                    if (isEditing) {
                      return (
                        <DateInput
                          value={editingPatientData?.date ? new Date(editingPatientData.date) : new Date(patient.date)}
                          onChange={(date) => {
                            if (date && editingPatientData) {
                              setEditingPatientData({ ...editingPatientData, date: date as any });
                            }
                          }}
                          size="xs"
                          valueFormat="DD/MM/YYYY"
                        />
                      );
                    }

                    return <Text size="sm">{format(new Date(patient.date), 'dd/MM/yyyy', { locale: fr })}</Text>;
                  },
                },
                {
                  accessor: 'type',
                  title: 'Type',
                  filter: (
                    <Select
                      placeholder="Tous les types"
                      data={[
                        { value: '', label: 'Tous les types' },
                        ...patientTypeOptions,
                      ]}
                      value={filterType || ''}
                      onChange={(value) => setFilterType(value === '' ? null : value)}
                      clearable
                      style={{ minWidth: 200 }}
                    />
                  ),
                  filtering: filterType !== null,
                  render: (patient: any) => {
                    const isNew = patient.isNew;
                    const isEditing = !isNew && editingPatient === patient.id;

                    if (isNew) {
                      return (
                        <Select
                          data={patientTypeOptions}
                          value={newPatient?.type}
                          onChange={(value) => {
                            if (value && newPatient) {
                              setNewPatient({ ...newPatient, type: value });
                            }
                          }}
                          size="xs"
                          placeholder="Type"
                        />
                      );
                    }

                    if (isEditing) {
                      return (
                        <Select
                          data={patientTypeOptions}
                          value={editingPatientData?.type || patient.type}
                          onChange={(value) => {
                            if (value && editingPatientData) {
                              setEditingPatientData({ ...editingPatientData, type: value });
                            }
                          }}
                          size="xs"
                        />
                      );
                    }

                    return (
                      <Badge
                        color={getPatientTypeColor(patient.type)}
                        variant="light"
                        size="sm"
                      >
                        {getPatientTypeLabel(patient.type)}
                      </Badge>
                    );
                  },
                },
                {
                  accessor: 'identity',
                  title: 'Identité',
                  filter: (
                    <Autocomplete
                      data={existingIdentities}
                      value={filterIdentity || ''}
                      onChange={(value) => setFilterIdentity(value === '' ? null : value)}
                      placeholder="Rechercher une identité..."
                      size="sm"
                      rightSection={
                        filterIdentity && filterIdentity.trim() ? (
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            onClick={() => setFilterIdentity(null)}
                            style={{ pointerEvents: 'auto' }}
                          >
                            <IconX size={14} />
                          </ActionIcon>
                        ) : null
                      }
                      style={{ minWidth: 200 }}
                    />
                  ),
                  filtering: filterIdentity !== null && filterIdentity.trim() !== '',
                  render: (patient: any) => {
                    const isNew = patient.isNew;
                    const isEditing = !isNew && editingPatient === patient.id;

                    if (isNew) {
                      return (
                        <SuggestionAutocomplete
                          value={newPatient?.identity || ''}
                          onChange={(value) => {
                            if (newPatient) {
                              setNewPatient({ ...newPatient, identity: value });
                            }
                          }}
                          suggestions={identitySuggestions}
                          onAddSuggestion={handleAddIdentitySuggestion}
                          onDeleteSuggestion={handleDeleteIdentitySuggestion}
                          placeholder="Identité"
                          size="xs"
                        />
                      );
                    }

                    if (isEditing) {
                      return (
                        <SuggestionAutocomplete
                          value={editingPatientData?.identity || patient.identity}
                          onChange={(value) => {
                            if (editingPatientData) {
                              setEditingPatientData({ ...editingPatientData, identity: value });
                            }
                          }}
                          suggestions={identitySuggestions}
                          onAddSuggestion={handleAddIdentitySuggestion}
                          onDeleteSuggestion={handleDeleteIdentitySuggestion}
                          size="xs"
                        />
                      );
                    }

                    return <Text size="sm">{patient.identity}</Text>;
                  },
                },
                {
                  accessor: 'consultationPrice',
                  title: 'Consultation ($)',
                  textAlign: 'right',
                  render: (patient: any) => {
                    const isNew = patient.isNew;
                    const isEditing = !isNew && editingPatient === patient.id;

                    if (isNew) {
                      return (
                        <NumberInput
                          value={newPatient?.consultationPrice}
                          onChange={(value) => {
                            if (newPatient) {
                              const consultationPrice = value ? Number(value) : 0;
                              const newAmountForCashRegister = !amountForCashRegisterManuallyModified
                                ? Math.round((consultationPrice * 0.5) * 100) / 100
                                : newPatient.amountForCashRegister;
                              setNewPatient({
                                ...newPatient,
                                consultationPrice,
                                amountForCashRegister: newAmountForCashRegister,
                              });
                            }
                          }}
                          size="xs"
                          min={0}
                          decimalScale={2}
                          placeholder="0.00"
                          style={{ width: '100%' }}
                        />
                      );
                    }

                    if (isEditing) {
                      return (
                        <NumberInput
                          value={editingPatientData?.consultationPrice !== undefined ? Number(editingPatientData.consultationPrice) : Number(patient.consultationPrice)}
                          onChange={(value) => {
                            if (editingPatientData) {
                              const consultationPrice = value ? Number(value) : 0;
                              const currentAmountForCashRegister = editingPatientData.amountForCashRegister !== undefined
                                ? editingPatientData.amountForCashRegister
                                : Number(patient.amountForCashRegister);
                              const newAmountForCashRegister = !amountForCashRegisterManuallyModified
                                ? Math.round((consultationPrice * 0.5) * 100) / 100
                                : currentAmountForCashRegister;
                              setEditingPatientData({
                                ...editingPatientData,
                                consultationPrice,
                                amountForCashRegister: newAmountForCashRegister,
                              });
                            }
                          }}
                          size="xs"
                          min={0}
                          decimalScale={2}
                          style={{ width: '100%' }}
                        />
                      );
                    }

                    return <Text size="sm" fw={600}>{Number(patient.consultationPrice).toFixed(2)} $</Text>;
                  },
                },
                {
                  accessor: 'otherPrice',
                  title: 'Autre ($)',
                  textAlign: 'right',
                  render: (patient: any) => {
                    const isNew = patient.isNew;
                    const isEditing = !isNew && editingPatient === patient.id;

                    if (isNew) {
                      return (
                        <NumberInput
                          value={newPatient?.otherPrice}
                          onChange={(value) => {
                            if (newPatient) {
                              setNewPatient({ ...newPatient, otherPrice: value ? Number(value) : 0 });
                            }
                          }}
                          size="xs"
                          min={0}
                          decimalScale={2}
                          placeholder="0.00"
                          style={{ width: '100%' }}
                        />
                      );
                    }

                    if (isEditing) {
                      return (
                        <NumberInput
                          value={editingPatientData?.otherPrice !== undefined ? Number(editingPatientData.otherPrice) : Number(patient.otherPrice)}
                          onChange={(value) => {
                            if (editingPatientData) {
                              setEditingPatientData({ ...editingPatientData, otherPrice: value ? Number(value) : 0 });
                            }
                          }}
                          size="xs"
                          min={0}
                          decimalScale={2}
                          style={{ width: '100%' }}
                        />
                      );
                    }

                    return <Text size="sm" fw={600}>{Number(patient.otherPrice).toFixed(2)} $</Text>;
                  },
                },
                {
                  accessor: 'amountForCashRegister',
                  title: '% Dispensaire',
                  textAlign: 'right',
                  render: (patient: any) => {
                    const isNew = patient.isNew;
                    const isEditing = !isNew && editingPatient === patient.id;

                    if (isNew) {
                      return (
                        <NumberInput
                          value={newPatient?.amountForCashRegister}
                          onChange={(value) => {
                            if (newPatient) {
                              setAmountForCashRegisterManuallyModified(true);
                              setNewPatient({ ...newPatient, amountForCashRegister: value ? Number(value) : 0 });
                            }
                          }}
                          size="xs"
                          min={0}
                          decimalScale={2}
                          placeholder="0.00"
                          style={{ width: '100%' }}
                        />
                      );
                    }

                    if (isEditing) {
                      return (
                        <NumberInput
                          value={editingPatientData?.amountForCashRegister !== undefined ? Number(editingPatientData.amountForCashRegister) : Number(patient.amountForCashRegister)}
                          onChange={(value) => {
                            if (editingPatientData) {
                              setAmountForCashRegisterManuallyModified(true);
                              setEditingPatientData({ ...editingPatientData, amountForCashRegister: value ? Number(value) : 0 });
                            }
                          }}
                          size="xs"
                          min={0}
                          decimalScale={2}
                          style={{ width: '100%' }}
                        />
                      );
                    }

                    return <Text size="sm" fw={600}>{Number(patient.amountForCashRegister).toFixed(2)} $</Text>;
                  },
                },
                {
                  accessor: 'depositedInCashRegister',
                  title: 'Déposé',
                  textAlign: 'center',
                  render: (patient: any) => {
                    const isNew = patient.isNew;
                    const isEditing = !isNew && editingPatient === patient.id;

                    if (isNew || isEditing) {
                      return (
                        <Group justify="center">
                          <Checkbox
                            checked={
                              isNew
                                ? newPatient?.depositedInCashRegister || false
                                : editingPatientData?.depositedInCashRegister !== undefined
                                  ? editingPatientData.depositedInCashRegister
                                  : patient.depositedInCashRegister
                            }
                            onChange={(e) => {
                              if (isNew && newPatient) {
                                setNewPatient({ ...newPatient, depositedInCashRegister: e.target.checked });
                              } else if (editingPatientData) {
                                setEditingPatientData({ ...editingPatientData, depositedInCashRegister: e.target.checked });
                              }
                            }}
                          />
                        </Group>
                      );
                    }

                    return (
                      <Badge color={patient.depositedInCashRegister ? 'green' : 'gray'} variant="light" size="sm">
                        {patient.depositedInCashRegister ? 'Oui' : 'Non'}
                      </Badge>
                    );
                  },
                },
                {
                  accessor: 'retrievedFromCashRegister',
                  title: 'Récupéré',
                  textAlign: 'center',
                  render: (patient: any) => {
                    const isNew = patient.isNew;
                    const isEditing = !isNew && editingPatient === patient.id;

                    if (isNew || isEditing) {
                      return (
                        <Group justify="center">
                          <Checkbox
                            checked={
                              isNew
                                ? newPatient?.retrievedFromCashRegister || false
                                : editingPatientData?.retrievedFromCashRegister !== undefined
                                  ? editingPatientData.retrievedFromCashRegister
                                  : patient.retrievedFromCashRegister
                            }
                            onChange={(e) => {
                              if (isNew && newPatient) {
                                setNewPatient({ ...newPatient, retrievedFromCashRegister: e.target.checked });
                              } else if (editingPatientData) {
                                setEditingPatientData({ ...editingPatientData, retrievedFromCashRegister: e.target.checked });
                              }
                            }}
                          />
                        </Group>
                      );
                    }

                    return (
                      <Badge color={patient.retrievedFromCashRegister ? 'green' : 'gray'} variant="light" size="sm">
                        {patient.retrievedFromCashRegister ? 'Oui' : 'Non'}
                      </Badge>
                    );
                  },
                },
                {
                  accessor: 'actions',
                  title: 'Actions',
                  textAlign: 'center',
                  render: (patient: any) => {
                    const isNew = patient.isNew;
                    const isEditing = !isNew && editingPatient === patient.id;

                    if (isNew) {
                      return (
                        <Group gap="xs" justify="center" wrap="nowrap">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="green"
                            onClick={() => {
                              if (newPatient) {
                                handleSavePatient(newPatient);
                              }
                            }}
                            disabled={!newPatient?.date || !newPatient?.type || !newPatient?.identity}
                          >
                            <IconCheck size={18} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="gray"
                            onClick={() => setNewPatient(null)}
                          >
                            <IconX size={18} />
                          </ActionIcon>
                        </Group>
                      );
                    }

                    if (isEditing) {
                      return (
                        <Group gap="xs" justify="center" wrap="nowrap">
                          <ActionIcon
                            color="green"
                            variant="light"
                            onClick={() => {
                              if (editingPatientData) {
                                handleSavePatient({
                                  id: patient.id,
                                  date: editingPatientData.date || patient.date,
                                  type: editingPatientData.type || patient.type,
                                  identity: editingPatientData.identity || patient.identity,
                                  description: editingPatientData.description !== undefined ? editingPatientData.description : (patient.description || null),
                                  consultationPrice: editingPatientData.consultationPrice !== undefined ? editingPatientData.consultationPrice : Number(patient.consultationPrice),
                                  otherPrice: editingPatientData.otherPrice !== undefined ? editingPatientData.otherPrice : Number(patient.otherPrice),
                                  amountForCashRegister: editingPatientData.amountForCashRegister !== undefined ? editingPatientData.amountForCashRegister : Number(patient.amountForCashRegister),
                                  depositedInCashRegister: editingPatientData.depositedInCashRegister !== undefined ? editingPatientData.depositedInCashRegister : patient.depositedInCashRegister,
                                  retrievedFromCashRegister: editingPatientData.retrievedFromCashRegister !== undefined ? editingPatientData.retrievedFromCashRegister : patient.retrievedFromCashRegister,
                                  order: editingPatientData.order !== undefined ? editingPatientData.order : patient.order,
                                });
                              }
                            }}
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                          <ActionIcon
                            color="gray"
                            variant="light"
                            onClick={() => {
                              setEditingPatient(null);
                              setEditingPatientData(null);
                              setAmountForCashRegisterManuallyModified(false);
                            }}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        </Group>
                      );
                    }

                    const patientDate = new Date(patient.date);
                    patientDate.setHours(0, 0, 0, 0);

                    const sameDatePatients = week.patients.filter((p) => {
                      const pDate = new Date(p.date);
                      pDate.setHours(0, 0, 0, 0);
                      return pDate.getTime() === patientDate.getTime();
                    });

                    const sortedSameDate = [...sameDatePatients].sort((a, b) => a.order - b.order);
                    const currentIndex = sortedSameDate.findIndex((p) => p.id === patient.id);

                    const canMoveUpInOrder = currentIndex > 0;
                    const canMoveDownInOrder = currentIndex < sortedSameDate.length - 1;

                    const canMoveUp = sortOrder === 'desc' ? canMoveDownInOrder : canMoveUpInOrder;
                    const canMoveDown = sortOrder === 'desc' ? canMoveUpInOrder : canMoveDownInOrder;

                    return (
                      <Group gap="xs" justify="center" wrap="nowrap">
                        {sameDatePatients.length >= 2 && (
                          <>
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              color="gray"
                              onClick={() => handleReorderPatient(patient.id, 'up')}
                              disabled={!canMoveUp || loading || isEditing}
                              title={sortOrder === 'desc' ? 'Descendre' : 'Monter'}
                            >
                              <IconArrowUp size={16} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              size="sm"
                              color="gray"
                              onClick={() => handleReorderPatient(patient.id, 'down')}
                              disabled={!canMoveDown || loading || isEditing}
                              title={sortOrder === 'desc' ? 'Monter' : 'Descendre'}
                            >
                              <IconArrowDown size={16} />
                            </ActionIcon>
                          </>
                        )}
                        <ActionIcon
                          variant="subtle"
                          size="sm"
                          color="blue"
                          onClick={() => {
                            setAmountForCashRegisterManuallyModified(false);
                            setEditingPatient(patient.id);
                            setEditingPatientData({
                              date: patient.date,
                              type: patient.type,
                              identity: patient.identity,
                              description: patient.description ? patient.description : undefined,
                              consultationPrice: Number(patient.consultationPrice),
                              otherPrice: Number(patient.otherPrice),
                              amountForCashRegister: Number(patient.amountForCashRegister),
                              depositedInCashRegister: patient.depositedInCashRegister,
                              retrievedFromCashRegister: patient.retrievedFromCashRegister,
                              order: patient.order,
                            });
                          }}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          size="sm"
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer ce patient ?')) {
                              handleDeletePatient(patient.id);
                            }
                          }}
                          disabled={loading || isEditing}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    );
                  },
                },
              ]}
              striped
              highlightOnHover
              fetching={loading}
              noRecordsText="Aucun patient trouvé"
              sortStatus={{
                columnAccessor: 'date',
                direction: sortOrder,
              }}
              onSortStatusChange={(status) => {
                if (status) {
                  setSortOrder(status.direction === 'asc' ? 'asc' : 'desc');
                }
              }}
            />
            <Group p="md" justify="space-between" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
              <Text size="sm" c="dimmed">
                {displayedRowCount} ligne{displayedRowCount > 1 ? 's' : ''}
              </Text>
            </Group>
          </Paper>
        </DatesProvider>
      </Stack>
    </Container>
  );
}

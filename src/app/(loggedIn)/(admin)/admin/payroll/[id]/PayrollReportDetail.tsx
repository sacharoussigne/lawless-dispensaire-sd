'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Accordion,
  ActionIcon,
  Alert,
  Button,
  Container,
  CopyButton,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, getISOWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Prisma } from '@prisma/client';
import {
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconEdit,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { payrollReportResultSchema, type PayrollReportResult } from '@/lib/payroll/schema';
import { PAYROLL_CAISSE_USD } from '@/lib/payroll/constants';
import { recalculatePayrollResult } from '@/lib/payroll/recalculatePayrollResult';
import { routes } from '@/types/routes';

const DAYS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const;

const CAISSE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'X', label: 'X' },
] as const;

const PRESENCE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'P', label: 'P' },
] as const;

function wireTransferDescription(weekStart: Date, weekEnd: Date): string {
  return `Salaire Semaine ${format(weekStart, 'dd MMMM yyyy', { locale: fr })} au ${format(weekEnd, 'dd MMMM yyyy', { locale: fr })} - N°${getISOWeek(weekStart)}`;
}

function CopyableCell({ value, children }: { value: string; children: ReactNode }) {
  return (
    <Group gap={6} wrap="nowrap" align="flex-start">
      <div style={{ minWidth: 0, flex: 1 }}>{children}</div>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Copié' : 'Copier'} withArrow>
            <ActionIcon variant="subtle" size="sm" onClick={copy} aria-label="Copier">
              {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}

export default function PayrollReportDetail({
  canDelete,
  canEdit,
  report,
}: {
  canDelete: boolean;
  canEdit: boolean;
  report: {
    id: string;
    weekStart: string;
    weekEnd: string;
    resultJson: Prisma.JsonValue;
    errorMessage: string | null;
    createdAt: string;
    createdBy: { name: string; email: string };
  };
}) {
  const router = useRouter();
  const parsed = payrollReportResultSchema.safeParse(report.resultJson);
  const [draft, setDraft] = useState<PayrollReportResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const baselineJson = useRef('');

  const resultFingerprint = JSON.stringify(report.resultJson ?? null);

  useEffect(() => {
    setIsEditing(false);
    if (report.errorMessage) {
      setDraft(null);
      return;
    }
    const p = payrollReportResultSchema.safeParse(report.resultJson);
    if (p.success) {
      const r = recalculatePayrollResult(p.data);
      setDraft(r);
      baselineJson.current = JSON.stringify(r);
    } else {
      setDraft(null);
    }
  }, [report.errorMessage, report.id, resultFingerprint]);

  const isDirty = draft != null && JSON.stringify(draft) !== baselineJson.current;

  const updateSchedule = useCallback(
    (empIndex: number, day: (typeof DAYS)[number], field: 'caisse' | 'presence', raw: string | null) => {
      const mark =
        field === 'caisse'
          ? raw === 'X'
            ? 'X'
            : null
          : raw === 'P'
            ? 'P'
            : null;
      setDraft((prev) => {
        if (!prev) return prev;
        const employees = prev.employees.map((e, i) => {
          if (i !== empIndex) return e;
          return {
            ...e,
            schedule: {
              ...e.schedule,
              [day]: { ...e.schedule[day], [field]: mark },
            },
          };
        });
        return recalculatePayrollResult({ ...prev, employees });
      });
    },
    [],
  );

  const patchEmployeeStats = useCallback(
    (empIndex: number, patch: Partial<PayrollReportResult['employees'][number]['stats']>) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const employees = prev.employees.map((e, i) =>
          i === empIndex ? { ...e, stats: { ...e.stats, ...patch } } : e,
        );
        return recalculatePayrollResult({ ...prev, employees });
      });
    },
    [],
  );

  const handleCancelEdit = () => {
    const raw = baselineJson.current;
    if (raw) {
      try {
        const p = payrollReportResultSchema.safeParse(JSON.parse(raw) as unknown);
        if (p.success) {
          setDraft(recalculatePayrollResult(p.data));
        }
      } catch {
        // keep current draft if baseline is invalid
      }
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/payroll-reports/${report.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultJson: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : "Échec de l'enregistrement");
      }
      notifications.show({ title: 'Enregistré', message: '', color: 'green' });
      baselineJson.current = JSON.stringify(draft);
      setIsEditing(false);
      router.refresh();
    } catch (e: unknown) {
      notifications.show({
        title: 'Erreur',
        message: e instanceof Error ? e.message : 'Erreur inconnue',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: 'Supprimer ce rapport ?',
      children: <Text size="sm">Cette action est irréversible.</Text>,
      labels: { confirm: 'Supprimer', cancel: 'Annuler' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/payroll-reports/${report.id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(typeof data.error === 'string' ? data.error : 'Échec de la suppression');
          }
          notifications.show({ title: 'Rapport supprimé', message: '', color: 'green' });
          router.push(routes.admin.payroll);
          router.refresh();
        } catch (e: unknown) {
          notifications.show({
            title: 'Erreur',
            message: e instanceof Error ? e.message : 'Erreur inconnue',
            color: 'red',
          });
        }
      },
    });
  };

  const weekStartDate = new Date(report.weekStart);
  const weekEndDate = new Date(report.weekEnd);
  const wireDescription = wireTransferDescription(weekStartDate, weekEndDate);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl" align="flex-start" wrap="wrap">
        <div>
          <Button
            component={Link}
            href={routes.admin.payroll}
            variant="subtle"
            color="gray"
            size="sm"
            leftSection={<IconArrowLeft size={16} stroke={1.5} />}
            mb="xs"
          >
            Rapports salaires
          </Button>
          <Title order={1}>
            Semaine du {format(weekStartDate, 'dd MMMM yyyy', { locale: fr })} au{' '}
            {format(weekEndDate, 'dd MMMM yyyy', { locale: fr })}
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Par {report.createdBy.name} — {format(new Date(report.createdAt), 'Pp', { locale: fr })}
          </Text>
        </div>
        <Group gap="sm" justify="flex-end">
          {canDelete && (
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={18} />}
              onClick={handleDelete}
            >
              Supprimer
            </Button>
          )}
        </Group>
      </Group>

      {report.errorMessage && (
        <Alert color="red" title="Échec d&apos;analyse" mb="lg">
          {report.errorMessage}
        </Alert>
      )}

      {!report.errorMessage && parsed.success && draft && (
        <>
          <Paper shadow="sm" p="md" withBorder mb="lg">
            <Title order={4} mb="sm">
              Totaux
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              <div>
                <Text size="sm" c="dimmed">
                  Employés
                </Text>
                <Text fw={600}>{draft.global_stats.total_employees}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Caisses (total)
                </Text>
                <Text fw={600}>{draft.global_stats.total_caisses}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Shérifs soignés (total)
                </Text>
                <Text fw={600}>{draft.global_stats.total_sherifs}</Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Palefreniers (total)
                </Text>
                <Text fw={600}>{draft.global_stats.total_palefreniers}</Text>
              </div>
            </SimpleGrid>
          </Paper>

          <Paper shadow="sm" p="md" withBorder mb="lg">
            <Title order={4}>
              Virements
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              Informations pour les virements
            </Text>
            <Table striped highlightOnHover withTableBorder layout="fixed">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '18%' }}>Nom</Table.Th>
                  <Table.Th style={{ width: '12%' }}>N° compte</Table.Th>
                  <Table.Th style={{ width: '10%' }}>Présences</Table.Th>
                  <Table.Th style={{ width: '38%' }}>Description</Table.Th>
                  <Table.Th style={{ width: '14%' }}>Montant</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {draft.employees.map((emp, rowIdx) => {
                  const caisses = emp.stats.nombre_caisses ?? 0;
                  const pay = caisses * PAYROLL_CAISSE_USD;
                  const payStr = `${pay.toFixed(2)} $`;
                  const payCopyValue = pay.toFixed(2);
                  const idDisplay = emp.id != null ? String(emp.id) : '—';
                  const idCopy = idDisplay;
                  const presences = String(emp.stats.nombre_presences ?? 0);
                  return (
                    <Table.Tr key={`${emp.name}-${emp.id ?? rowIdx}`}>
                      <Table.Td>
                        <CopyableCell value={emp.name}>
                          <Text size="sm">{emp.name}</Text>
                        </CopyableCell>
                      </Table.Td>
                      <Table.Td>
                        <CopyableCell value={idCopy}>
                          <Text size="sm">{idDisplay}</Text>
                        </CopyableCell>
                      </Table.Td>
                      <Table.Td>
                        <CopyableCell value={presences}>
                          <Text size="sm">{presences}</Text>
                        </CopyableCell>
                      </Table.Td>
                      <Table.Td>
                        <CopyableCell value={wireDescription}>
                          <Text size="sm" style={{ wordBreak: 'break-word' }}>
                            {wireDescription}
                          </Text>
                        </CopyableCell>
                      </Table.Td>
                      <Table.Td>
                        <CopyableCell value={payCopyValue}>
                          <Text size="sm" fw={500}>
                            {payStr}
                          </Text>
                        </CopyableCell>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>

          <Group justify="end" mb="lg" align="flex-start">
            {canEdit && draft && !isEditing && (
              <Button
                leftSection={<IconEdit size={18} />}
                onClick={() => setIsEditing(true)}
                variant="light"
              >
                Modifier
              </Button>
            )}
            {canEdit && draft && isEditing && (
              <>
                <Button leftSection={<IconX size={18} />} onClick={handleCancelEdit} variant="subtle" color="gray">
                  Annuler
                </Button>
                <Button
                  leftSection={<IconCheck size={18} />}
                  onClick={handleSave}
                  loading={saving}
                  disabled={!isDirty}
                  variant="filled"
                  color="green"
                >
                  Sauvegarder
                </Button>
              </>
            )}
          </Group>

          <Accordion
            variant="separated"
            radius="md"
            multiple
            mb="xl"
            defaultValue={draft.employees.length > 0 ? ['emp-0'] : undefined}
          >
            {draft.employees.map((emp, i) => {
              const caisses = emp.stats.nombre_caisses ?? 0;
              const pay = caisses * PAYROLL_CAISSE_USD;
              return (
                <Accordion.Item key={`${emp.name}-${emp.id ?? i}`} value={`emp-${i}`}>
                  <Accordion.Control>
                    <Group justify="space-between" wrap="nowrap" gap="md" pr="xs">
                      <div>
                        <Text fw={600}>{emp.name}</Text>
                        <Text size="sm" c="dimmed">
                          {emp.role}
                          {emp.id != null ? ` — Compte ${emp.id}` : ''}
                        </Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text size="xs" c="dimmed">
                          Caisses × {PAYROLL_CAISSE_USD} $
                        </Text>
                        <Text fw={700}>{pay.toFixed(2)} $</Text>
                      </div>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Text size="sm" fw={500} mb={6}>
                      Planning
                    </Text>
                    <Table striped highlightOnHover withTableBorder>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Jour</Table.Th>
                          <Table.Th>Caisse</Table.Th>
                          <Table.Th>Présence soins</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {DAYS.map((day) => (
                          <Table.Tr key={day}>
                            <Table.Td style={{ textTransform: 'capitalize' }}>{day}</Table.Td>
                            <Table.Td>
                              {canEdit && isEditing ? (
                                <Select
                                  size="xs"
                                  data={[...CAISSE_OPTIONS]}
                                  value={emp.schedule[day].caisse ?? ''}
                                  onChange={(v) => updateSchedule(i, day, 'caisse', v)}
                                  w={72}
                                />
                              ) : (
                                emp.schedule[day]?.caisse ?? '—'
                              )}
                            </Table.Td>
                            <Table.Td>
                              {canEdit && isEditing ? (
                                <Select
                                  size="xs"
                                  data={[...PRESENCE_OPTIONS]}
                                  value={emp.schedule[day].presence ?? ''}
                                  onChange={(v) => updateSchedule(i, day, 'presence', v)}
                                  w={72}
                                />
                              ) : (
                                emp.schedule[day]?.presence ?? '—'
                              )}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>

                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" mt="md">
                      <div>
                        <Text size="xs" c="dimmed" mb={4}>
                          Shérifs soignés
                        </Text>
                        {canEdit && isEditing ? (
                          <NumberInput
                            size="xs"
                            min={0}
                            allowDecimal={false}
                            value={emp.stats.sherifs ?? ''}
                            onChange={(v) =>
                              patchEmployeeStats(i, {
                                sherifs: v === '' || v === undefined ? null : Number(v),
                              })
                            }
                          />
                        ) : (
                          <Text>{emp.stats.sherifs ?? '—'}</Text>
                        )}
                      </div>
                      <div>
                        <Text size="xs" c="dimmed" mb={4}>
                          Palefreniers soignés
                        </Text>
                        {canEdit && isEditing ? (
                          <NumberInput
                            size="xs"
                            min={0}
                            allowDecimal={false}
                            value={emp.stats.palefreniers ?? ''}
                            onChange={(v) =>
                              patchEmployeeStats(i, {
                                palefreniers: v === '' || v === undefined ? null : Number(v),
                              })
                            }
                          />
                        ) : (
                          <Text>{emp.stats.palefreniers ?? '—'}</Text>
                        )}
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">
                          Caisses
                        </Text>
                        <Text>{emp.stats.nombre_caisses ?? '—'}</Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">
                          Présences
                        </Text>
                        <Text>{emp.stats.nombre_presences ?? '—'}</Text>
                      </div>
                    </SimpleGrid>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </>
      )}

      {!report.errorMessage && !parsed.success && report.resultJson != null && (
        <Alert color="orange" title="Données non reconnues">
          Le JSON enregistré ne correspond pas au format attendu.
        </Alert>
      )}

      {!report.errorMessage && !parsed.success && report.resultJson == null && (
        <Alert color="gray" title="Données indisponibles">
          Ce rapport n&apos;a pas encore de résultat enregistré.
        </Alert>
      )}
    </Container>
  );
}

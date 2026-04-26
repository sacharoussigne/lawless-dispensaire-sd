'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Accordion,
  ActionIcon,
  Alert,
  Box,
  Button,
  Code,
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
import { format, getISOWeek, subYears } from 'date-fns';
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
import {
  deletePayrollReport,
  updatePayrollReportResultJson,
} from '@/app/_actions/payrollReports';
import { handleAction } from '@/lib/action';
import { payrollReportResultSchema, type PayrollReportResult } from '@/lib/payroll/schema';
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

const BANDAGE_EXPORT_DEPOSIT_MOTIF = "Caisse d'exportation Bandage";

/** Display-only: RP calendar is 136 years before real dates (DB unchanged). */
const PAYROLL_RP_DISPLAY_YEAR_OFFSET = 136;

function payrollRpDisplayDate(d: Date): Date {
  return subYears(d, PAYROLL_RP_DISPLAY_YEAR_OFFSET);
}

function wireTransferDescription(weekStart: Date, weekEnd: Date): string {
  const displayStart = payrollRpDisplayDate(weekStart);
  const displayEnd = payrollRpDisplayDate(weekEnd);
  return `Salaire Semaine ${format(displayStart, 'dd MMMM yyyy', { locale: fr })} au ${format(displayEnd, 'dd MMMM yyyy', { locale: fr })} - N°${getISOWeek(weekStart)}`;
}

function CopyableCell({
  value,
  children,
  copyFaded,
}: {
  value: string;
  children: ReactNode;
  /** When true, copy control is de-emphasized until the row is hovered. */
  copyFaded?: boolean;
}) {
  return (
    <Group gap={6} wrap="nowrap" align="flex-start">
      <div style={{ minWidth: 0, flex: 1 }}>{children}</div>
      <CopyButton value={value}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Copié' : 'Copier'} withArrow openDelay={100}>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={copy}
              aria-label="Copier"
              style={{
                opacity: copyFaded ? 0.2 : 1,
                transition: 'opacity 120ms ease',
              }}
            >
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
  const [hoveredVirementRow, setHoveredVirementRow] = useState<number | null>(null);
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

  const patchReportCaissePrice = useCallback((value: number | string) => {
    if (value === '' || value === undefined) return;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    setDraft((prev) => (prev ? recalculatePayrollResult({ ...prev, caisse_price_usd: n }) : prev));
  }, []);

  const patchReportCaisseSalePrice = useCallback((value: number | string) => {
    if (value === '' || value === undefined) return;
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    setDraft((prev) => (prev ? recalculatePayrollResult({ ...prev, caisse_sale_price_usd: n }) : prev));
  }, []);

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
      const result = await updatePayrollReportResultJson(report.id, draft);
      handleAction(result);
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
          const result = await deletePayrollReport(report.id);
          handleAction(result);
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
            Semaine du {format(payrollRpDisplayDate(weekStartDate), 'dd MMMM yyyy', { locale: fr })} au{' '}
            {format(payrollRpDisplayDate(weekEndDate), 'dd MMMM yyyy', { locale: fr })}
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Par {report.createdBy.name} — {format(new Date(report.createdAt), 'Pp', { locale: fr })}
          </Text>
        </div>
        <Group gap="sm" justify="flex-end" wrap="wrap">
          {canEdit && !isEditing && !isDirty && (
            <Button leftSection={<IconEdit size={18} />} onClick={() => setIsEditing(true)} variant="light">
              Modifier
            </Button>
          )}
          {canEdit && (isDirty || isEditing) && (
            <Button leftSection={<IconX size={18} />} onClick={handleCancelEdit} variant="subtle" color="gray">
              Annuler
            </Button>
          )}
          {canEdit && (isDirty || isEditing) && (
            <Button
              leftSection={<IconCheck size={18} />}
              onClick={handleSave}
              disabled={!isDirty}
              loading={saving}
              variant="filled"
              color="green"
            >
              Sauvegarder
            </Button>
          )}
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
            <SimpleGrid cols={{ base: 1, sm: 2, md: 2, lg: 4 }} spacing="md">
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
                <Text size="sm" c="dimmed" mb={4}>
                  Prix vente dispensaire ($)
                </Text>
                {canEdit && isEditing ? (
                  <NumberInput
                    size="xs"
                    min={0.01}
                    max={1_000_000}
                    step={0.5}
                    decimalScale={2}
                    value={draft.caisse_sale_price_usd}
                    onChange={(v) => patchReportCaisseSalePrice(v)}
                    w={110}
                  />
                ) : (
                  <Text fw={600}>{draft.caisse_sale_price_usd.toFixed(2)}</Text>
                )}
              </div>
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Reversé employé ($)
                </Text>
                {canEdit && isEditing ? (
                  <NumberInput
                    size="xs"
                    min={0.01}
                    max={1_000_000}
                    step={0.5}
                    decimalScale={2}
                    value={draft.caisse_price_usd}
                    onChange={(v) => patchReportCaissePrice(v)}
                    w={110}
                  />
                ) : (
                  <Text fw={600}>{draft.caisse_price_usd.toFixed(2)}</Text>
                )}
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Total salaires ($)
                </Text>
                <Text fw={600}>
                  {(draft.global_stats.total_caisses * draft.caisse_price_usd).toFixed(2)} $
                </Text>
              </div>
              <div>
                <Text size="sm" c="dimmed">
                  Bénéfice ($)
                </Text>
                <Text fw={600}>{draft.global_stats.total_benefit_usd.toFixed(2)} $</Text>
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
            <Text size="sm" c="dimmed" mb="sm">
              Montants et libellés à utiliser pour les virements bancaires.
            </Text>
            <Box
              mb="sm"
              pl="xs"
              ml={2}
              style={{ borderLeft: '2px solid var(--mantine-color-gray-3)' }}
            >
              <Text size="xs" c="dimmed" lh={1.45} mb={4}>
                Dépôt des caisses d&apos;export de bandage — motif à indiquer&nbsp;:
              </Text>
              <Group gap={6} align="center" wrap="wrap">
                <Code fz="xs" fw={500} px={6} py={2}>
                  {BANDAGE_EXPORT_DEPOSIT_MOTIF}
                </Code>
                <CopyButton value={BANDAGE_EXPORT_DEPOSIT_MOTIF}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copié' : 'Copier le motif'} withArrow>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="xs"
                        onClick={copy}
                        aria-label="Copier le motif"
                      >
                        {copied ? <IconCheck size={12} stroke={1.5} /> : <IconCopy size={12} stroke={1.5} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
            </Box>
            <Table striped highlightOnHover withTableBorder layout="fixed">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '18%' }}>Nom</Table.Th>
                  <Table.Th style={{ width: '12%' }}>N° compte</Table.Th>
                  <Table.Th style={{ width: '10%' }}>Présences</Table.Th>
                  <Table.Th style={{ width: '40%' }}>Description</Table.Th>
                  <Table.Th style={{ width: '16%' }}>Montant</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody onMouseLeave={() => setHoveredVirementRow(null)}>
                {draft.employees.map((emp, rowIdx) => {
                  const caisses = emp.stats.nombre_caisses ?? 0;
                  const unit = draft.caisse_price_usd;
                  const pay = caisses * unit;
                  const payStr = `${pay.toFixed(2)} $`;
                  const payCopyValue = pay.toFixed(2);
                  const idDisplay = emp.id != null ? String(emp.id) : '—';
                  const idCopy = idDisplay;
                  const presences = String(emp.stats.nombre_presences ?? 0);
                  const copyFaded = hoveredVirementRow !== rowIdx;
                  return (
                    <Table.Tr
                      key={`${emp.name}-${emp.id ?? rowIdx}`}
                      onMouseEnter={() => setHoveredVirementRow(rowIdx)}
                    >
                      <Table.Td>
                        <CopyableCell value={emp.name} copyFaded={copyFaded}>
                          <Text size="sm">{emp.name}</Text>
                        </CopyableCell>
                      </Table.Td>
                      <Table.Td>
                        <CopyableCell value={idCopy} copyFaded={copyFaded}>
                          <Text size="sm">{idDisplay}</Text>
                        </CopyableCell>
                      </Table.Td>
                      <Table.Td>
                        <CopyableCell value={presences} copyFaded={copyFaded}>
                          <Text size="sm">{presences}</Text>
                        </CopyableCell>
                      </Table.Td>
                      <Table.Td>
                        <CopyableCell value={wireDescription} copyFaded={copyFaded}>
                          <Text size="sm" style={{ wordBreak: 'break-word' }}>
                            {wireDescription}
                          </Text>
                        </CopyableCell>
                      </Table.Td>
                      <Table.Td>
                        <CopyableCell value={payCopyValue} copyFaded={copyFaded}>
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

          <Accordion
            variant="separated"
            radius="md"
            multiple
            mb="xl"
            defaultValue={draft.employees.length > 0 ? ['emp-0'] : undefined}
          >
            {draft.employees.map((emp, i) => {
              const caisses = emp.stats.nombre_caisses ?? 0;
              const unit = draft.caisse_price_usd;
              const pay = caisses * unit;
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
                          Caisses × {unit.toFixed(2)} $
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
                          Shérifs
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
                          Palefreniers
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

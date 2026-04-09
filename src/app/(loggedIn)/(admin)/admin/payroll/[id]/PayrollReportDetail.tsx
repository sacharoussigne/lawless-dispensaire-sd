'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Container,
  CopyButton,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
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
import { IconCheck, IconDeviceFloppy, IconCopy, IconTrash } from '@tabler/icons-react';
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
  return `Salaire Semaine ${format(weekStart, 'd MMMM yyyy', { locale: fr })} au ${format(weekEnd, 'd MMMM yyyy', { locale: fr })} - N°${getISOWeek(weekStart)}`;
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
  const [saving, setSaving] = useState(false);
  const baselineJson = useRef('');

  const resultFingerprint = JSON.stringify(report.resultJson ?? null);

  useEffect(() => {
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
    <Container size="xl">
      <Group justify="space-between" mb="lg" align="flex-start">
        <div>
          <Anchor component={Link} href={routes.admin.payroll} size="sm" mb={4}>
            ← Rapports salaires
          </Anchor>
          <Title order={2}>
            Semaine du {format(weekStartDate, 'd MMMM yyyy', { locale: fr })} au{' '}
            {format(weekEndDate, 'd MMMM yyyy', { locale: fr })}
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Par {report.createdBy.name} — {format(new Date(report.createdAt), 'Pp', { locale: fr })}
          </Text>
        </div>
        <Group gap="sm">
          {canEdit && draft && (
            <Button
              leftSection={<IconDeviceFloppy size={18} />}
              onClick={handleSave}
              loading={saving}
              disabled={!isDirty}
            >
              Enregistrer
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
            <Title order={4} mb="sm">
              Virements
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              Informations pour les virements — chaque champ peut être copié.
            </Text>
            <Table striped highlightOnHover withTableBorder layout="fixed">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '18%' }}>Nom</Table.Th>
                  <Table.Th style={{ width: '12%' }}>N° compte (ID)</Table.Th>
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
                        <CopyableCell value={payStr}>
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

          <Stack gap="xl">
            {draft.employees.map((emp, i) => {
              const caisses = emp.stats.nombre_caisses ?? 0;
              const pay = caisses * PAYROLL_CAISSE_USD;
              return (
                <Paper key={`${emp.name}-${emp.id ?? i}`} shadow="sm" p="md" withBorder>
                  <Group justify="space-between" mb="sm">
                    <div>
                      <Text fw={600}>{emp.name}</Text>
                      <Text size="sm" c="dimmed">
                        {emp.role}
                        {emp.id != null ? ` — ID ${emp.id}` : ''}
                      </Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text size="sm" c="dimmed">
                        Estimation caisses × {PAYROLL_CAISSE_USD} $
                      </Text>
                      <Text fw={700}>{pay.toFixed(2)} $</Text>
                    </div>
                  </Group>

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
                            {canEdit ? (
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
                            {canEdit ? (
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
                      {canEdit ? (
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
                      {canEdit ? (
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
                </Paper>
              );
            })}
          </Stack>
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

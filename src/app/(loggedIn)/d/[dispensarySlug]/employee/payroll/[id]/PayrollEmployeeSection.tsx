'use client';

import {
  Accordion,
  ActionIcon,
  Divider,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import type { PayrollReportResult } from '@/lib/payroll/schema';
import { effectiveCaisseUnitUsd } from '@/lib/payroll/recalculatePayrollResult';
import { PAYROLL_MAX_USD } from '@/lib/payroll/constants';
import {
  CAISSE_OPTIONS,
  PAYROLL_DAYS,
  PRESENCE_OPTIONS,
  type PayrollDay,
} from './payrollDetailUtils';

type PayrollEmployeeSectionProps = {
  draft: PayrollReportResult;
  canEdit: boolean;
  isEditing: boolean;
  onUpdateSchedule: (
    empIndex: number,
    day: PayrollDay,
    field: 'caisse' | 'presence',
    raw: string | null,
  ) => void;
  onPatchEmployeeStats: (
    empIndex: number,
    patch: Partial<PayrollReportResult['employees'][number]['stats']>,
  ) => void;
  onPatchEmployeePayrollSettings: (
    empIndex: number,
    patch: {
      caisse_unit_override_usd?: number | undefined;
      salary_supplement_usd?: number;
    },
  ) => void;
};

export function PayrollEmployeeSection({
  draft,
  canEdit,
  isEditing,
  onUpdateSchedule,
  onPatchEmployeeStats,
  onPatchEmployeePayrollSettings,
}: PayrollEmployeeSectionProps) {
  return (
    <Accordion variant="contained" radius="md" mb="xl">
      {draft.employees.map((emp, i) => {
        const caisses = emp.stats.nombre_caisses ?? 0;
        const patients = emp.stats.patients_soignes ?? 0;
        const unitUsd = effectiveCaisseUnitUsd(emp, draft.caisse_price_usd);
        const supplement = emp.salary_supplement_usd ?? 0;
        const pay = caisses * unitUsd + patients * draft.patient_care_price_usd + supplement;
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
                    Caisses × {unitUsd.toFixed(2)} $ + patients × {draft.patient_care_price_usd.toFixed(2)} $
                    {supplement !== 0 ? ` ${supplement >= 0 ? '+' : ''}${supplement.toFixed(2)} $` : ''}
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
                  {PAYROLL_DAYS.map((day) => (
                    <Table.Tr key={day}>
                      <Table.Td style={{ textTransform: 'capitalize' }}>{day}</Table.Td>
                      <Table.Td>
                        {canEdit && isEditing ? (
                          <Select
                            size="xs"
                            data={[...CAISSE_OPTIONS]}
                            value={emp.schedule[day].caisse ?? ''}
                            onChange={(v) => onUpdateSchedule(i, day, 'caisse', v)}
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
                            onChange={(v) => onUpdateSchedule(i, day, 'presence', v)}
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

              <Divider label="Rémunération" labelPosition="left" my="md" />
              {canEdit && isEditing ? (
                <Group align="flex-start" gap="lg" wrap="wrap" mb="md">
                  <div>
                    <Text size="xs" c="dimmed" mb={4}>
                      Reversé par caisse
                    </Text>
                    <NumberInput
                      size="xs"
                      min={0.01}
                      max={PAYROLL_MAX_USD}
                      step={0.05}
                      decimalScale={2}
                      placeholder={`Par défaut : ${draft.caisse_price_usd.toFixed(2)} $`}
                      value={emp.caisse_unit_override_usd ?? ''}
                      onChange={(v) => {
                        if (v === '' || v === undefined) {
                          onPatchEmployeePayrollSettings(i, { caisse_unit_override_usd: undefined });
                          return;
                        }
                        const n = typeof v === 'number' ? v : Number(v);
                        if (!Number.isFinite(n) || n <= 0) return;
                        onPatchEmployeePayrollSettings(i, { caisse_unit_override_usd: n });
                      }}
                      suffix=" $"
                      w="100%"
                      maw={220}
                      rightSectionWidth={42}
                      rightSection={
                        emp.caisse_unit_override_usd != null ? (
                          <Tooltip label="Revenir au défaut du rapport" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="slate"
                              size="sm"
                              aria-label="Réinitialiser au défaut"
                              onClick={() =>
                                onPatchEmployeePayrollSettings(i, { caisse_unit_override_usd: undefined })
                              }
                            >
                              <IconRefresh size={16} stroke={1.5} />
                            </ActionIcon>
                          </Tooltip>
                        ) : null
                      }
                    />
                  </div>
                  <div>
                    <Text size="xs" c="dimmed" mb={4}>
                      Complément de salaire
                    </Text>
                    <NumberInput
                      size="xs"
                      min={-PAYROLL_MAX_USD}
                      max={PAYROLL_MAX_USD}
                      step={0.5}
                      decimalScale={2}
                      value={emp.salary_supplement_usd ?? 0}
                      onChange={(v) =>
                        onPatchEmployeePayrollSettings(i, {
                          salary_supplement_usd: v === '' || v === undefined ? 0 : Number(v),
                        })
                      }
                      suffix=" $"
                      w="100%"
                      maw={220}
                    />
                  </div>
                </Group>
              ) : (
                <Stack gap={6} mb="md">
                  <Text size="sm">
                    Reversé par caisse :{' '}
                    <Text span fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {unitUsd.toFixed(2)} $
                    </Text>
                    {emp.caisse_unit_override_usd != null ? (
                      <Text span size="xs" c="dimmed" ml={6}>
                        (par defaut: {draft.caisse_price_usd.toFixed(2)} $)
                      </Text>
                    ) : null}
                  </Text>
                  {(emp.salary_supplement_usd ?? 0) !== 0 && (
                    <Text size="sm">
                      Complément :{' '}
                      <Text span fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {(emp.salary_supplement_usd ?? 0).toFixed(2)} $
                      </Text>
                    </Text>
                  )}
                </Stack>
              )}

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
                        onPatchEmployeeStats(i, { sherifs: v === '' || v === undefined ? null : Number(v) })
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
                        onPatchEmployeeStats(i, {
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
                <div>
                  <Text size="xs" c="dimmed" mb={4}>
                    Patients soignés
                  </Text>
                  {canEdit && isEditing ? (
                    <NumberInput
                      size="xs"
                      min={0}
                      allowDecimal={false}
                      value={emp.stats.patients_soignes}
                      onChange={(v) =>
                        onPatchEmployeeStats(i, {
                          patients_soignes: v === '' || v === undefined ? 0 : Number(v),
                        })
                      }
                    />
                  ) : (
                    <Text>{emp.stats.patients_soignes}</Text>
                  )}
                </div>
                <div>
                  <Text size="xs" c="dimmed" mb={4}>
                    Lait de pavot offert
                  </Text>
                  {canEdit && isEditing ? (
                    <NumberInput
                      size="xs"
                      min={0}
                      allowDecimal={false}
                      value={emp.stats.poppy_milk_offertes}
                      onChange={(v) =>
                        onPatchEmployeeStats(i, {
                          poppy_milk_offertes: v === '' || v === undefined ? 0 : Number(v),
                        })
                      }
                    />
                  ) : (
                    <Text>{emp.stats.poppy_milk_offertes}</Text>
                  )}
                </div>
                <div>
                  <Text size="xs" c="dimmed" mb={4}>
                    Infusions ginseng offertes
                  </Text>
                  {canEdit && isEditing ? (
                    <NumberInput
                      size="xs"
                      min={0}
                      allowDecimal={false}
                      value={emp.stats.infusions_ginseng_offertes}
                      onChange={(v) =>
                        onPatchEmployeeStats(i, {
                          infusions_ginseng_offertes: v === '' || v === undefined ? 0 : Number(v),
                        })
                      }
                    />
                  ) : (
                    <Text>{emp.stats.infusions_ginseng_offertes}</Text>
                  )}
                </div>
              </SimpleGrid>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}

'use client';

import { useState } from 'react';
import {
  ActionIcon,
  Box,
  Code,
  CopyButton,
  Group,
  Paper,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import type { PayrollReportResult } from '@/lib/payroll/schema';
import { effectiveCaisseUnitUsd } from '@/lib/payroll/recalculatePayrollResult';
import { BANDAGE_EXPORT_DEPOSIT_MOTIF } from './payrollDetailUtils';
import { CopyableCell } from './CopyableCell';

type PayrollVirementsSectionProps = {
  draft: PayrollReportResult;
  wireDescription: string;
};

export function PayrollVirementsSection({ draft, wireDescription }: PayrollVirementsSectionProps) {
  const [hoveredVirementRow, setHoveredVirementRow] = useState<number | null>(null);

  return (
    <Paper shadow="sm" p="md" withBorder mb="lg">
      <Title order={4}>Virements</Title>
      <Text size="sm" c="dimmed" mb="sm">
        Montants et libellés à utiliser pour les virements bancaires.
      </Text>
      <Box mb="sm" pl="xs" ml={2} style={{ borderLeft: '2px solid var(--mantine-color-slate-3)' }}>
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
                  color="slate"
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
      <Table striped highlightOnHover withTableBorder layout="fixed" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
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
            const patients = emp.stats.patients_soignes ?? 0;
            const unitUsd = effectiveCaisseUnitUsd(emp, draft.caisse_price_usd);
            const supplement = emp.salary_supplement_usd ?? 0;
            const pay = caisses * unitUsd + patients * draft.patient_care_price_usd + supplement;
            const payStr = `${pay.toFixed(2)} $`;
            const payCopyValue = pay.toFixed(2);
            const idDisplay = emp.id != null ? String(emp.id) : '—';
            const presences = String(emp.stats.nombre_presences ?? 0);
            const copyFaded = hoveredVirementRow !== rowIdx;
            return (
              <Table.Tr key={`${emp.name}-${emp.id ?? rowIdx}`} onMouseEnter={() => setHoveredVirementRow(rowIdx)}>
                <Table.Td>
                  <CopyableCell value={emp.name} copyFaded={copyFaded}>
                    <Text size="sm">{emp.name}</Text>
                  </CopyableCell>
                </Table.Td>
                <Table.Td>
                  <CopyableCell value={idDisplay} copyFaded={copyFaded}>
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
  );
}

'use client';

import {
  Box,
  Collapse,
  Divider,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { IconCalculator, IconChevronDown, IconCoin } from '@tabler/icons-react';
import type { PayrollReportResult } from '@/lib/payroll/schema';

type PayrollTotalsPaperProps = {
  draft: PayrollReportResult;
  canEdit: boolean;
  isEditing: boolean;
  pricingSectionOpen: boolean;
  onPricingSectionToggle: () => void;
  onCaisseSalePriceChange: (value: number | string) => void;
  onCaissePriceChange: (value: number | string) => void;
  onPatientCarePriceChange: (value: number | string) => void;
  onOfferedItemPriceChange: (value: number | string) => void;
};

export function PayrollTotalsPaper({
  draft,
  canEdit,
  isEditing,
  pricingSectionOpen,
  onPricingSectionToggle,
  onCaisseSalePriceChange,
  onCaissePriceChange,
  onPatientCarePriceChange,
  onOfferedItemPriceChange,
}: PayrollTotalsPaperProps) {
  return (
    <Paper shadow="sm" p="md" withBorder mb="lg">
      <Title order={4} mb="xs">
        Totaux
      </Title>
      <Stack gap="xl">
        <Paper p="md" radius="md" withBorder style={{ background: 'var(--disp-table-header)' }}>
          <UnstyledButton
            type="button"
            onClick={onPricingSectionToggle}
            w="100%"
            p={0}
            style={{ textAlign: 'left' as const, borderRadius: 'var(--mantine-radius-sm)' }}
          >
            <Group align="flex-start" gap="md" wrap="nowrap" justify="space-between">
              <Group align="flex-start" gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
                <IconCoin
                  size={22}
                  stroke={1.5}
                  style={{ flexShrink: 0, color: 'var(--disp-ink-muted)', marginTop: 2 }}
                />
                <div>
                  <Text fw={600} size="sm">
                    Grille tarifaire
                  </Text>
                  <Text size="xs" c="dimmed" maw={520}>
                    Prix unitaire par caisse, soin patient et offre. En pratique, ne les ajustez que si la grille
                    tarifaire a changé. Cliquer pour afficher ou masquer.
                  </Text>
                </div>
              </Group>
              <IconChevronDown
                size={20}
                stroke={1.5}
                style={{
                  flexShrink: 0,
                  color: 'var(--disp-ink-muted)',
                  transform: pricingSectionOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 200ms ease',
                  marginTop: 2,
                }}
              />
            </Group>
          </UnstyledButton>
          <Collapse in={pricingSectionOpen}>
            <Box pt="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <div>
                  <Text size="sm" c="dimmed" mb={6}>
                    Prix de vente dispensaire
                  </Text>
                  {canEdit && isEditing ? (
                    <NumberInput
                      size="sm"
                      min={0.01}
                      max={1_000_000}
                      step={0.5}
                      decimalScale={2}
                      value={draft.caisse_sale_price_usd}
                      onChange={(v) => onCaisseSalePriceChange(v)}
                      w="100%"
                      maw={200}
                      suffix=" $"
                    />
                  ) : (
                    <Text fw={600} size="md" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {draft.caisse_sale_price_usd.toFixed(2)} $
                    </Text>
                  )}
                </div>
                <div>
                  <Text size="sm" c="dimmed" mb={6}>
                    Reversé employé / caisse
                  </Text>
                  {canEdit && isEditing ? (
                    <NumberInput
                      size="sm"
                      min={0.01}
                      max={1_000_000}
                      step={0.5}
                      decimalScale={2}
                      value={draft.caisse_price_usd}
                      onChange={(v) => onCaissePriceChange(v)}
                      w="100%"
                      maw={200}
                      suffix=" $"
                    />
                  ) : (
                    <Text fw={600} size="md" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {draft.caisse_price_usd.toFixed(2)} $
                    </Text>
                  )}
                </div>
                <div>
                  <Text size="sm" c="dimmed" mb={6}>
                    Bonus par patient soigné
                  </Text>
                  {canEdit && isEditing ? (
                    <NumberInput
                      size="sm"
                      min={0.01}
                      max={1_000_000}
                      step={0.05}
                      decimalScale={2}
                      value={draft.patient_care_price_usd}
                      onChange={(v) => onPatientCarePriceChange(v)}
                      w="100%"
                      maw={200}
                      suffix=" $"
                    />
                  ) : (
                    <Text fw={600} size="md" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {draft.patient_care_price_usd.toFixed(2)} $
                    </Text>
                  )}
                </div>
                <div>
                  <Text size="sm" c="dimmed" mb={6}>
                    Prix unitaire des items offerts
                  </Text>
                  {canEdit && isEditing ? (
                    <NumberInput
                      size="sm"
                      min={0.01}
                      max={1_000_000}
                      step={0.05}
                      decimalScale={2}
                      value={draft.offered_item_price_usd}
                      onChange={(v) => onOfferedItemPriceChange(v)}
                      w="100%"
                      maw={200}
                      suffix=" $"
                    />
                  ) : (
                    <Text fw={600} size="md" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {draft.offered_item_price_usd.toFixed(2)} $
                    </Text>
                  )}
                </div>
              </SimpleGrid>
            </Box>
          </Collapse>
        </Paper>

        <div>
          <Group align="flex-start" gap="md" wrap="nowrap" mb="md">
            <IconCalculator
              size={22}
              stroke={1.5}
              style={{ flexShrink: 0, color: 'var(--disp-ink-muted)', marginTop: 2 }}
            />
            <div>
              <Text fw={600} size="sm">
                Synthèse calculée
              </Text>
              <Text size="xs" c="dimmed" maw={560}>
                Quantités et montants dérivés du planning et de la grille tarifaire (non éditables ici).
              </Text>
            </div>
          </Group>

          <Text size="xs" tt="uppercase" fw={600} c="dimmed" mb="sm" style={{ letterSpacing: '0.04em' }}>
            Effectif et volumes
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="lg">
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Employés
              </Text>
              <Text fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {draft.global_stats.total_employees}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Caisses
              </Text>
              <Text fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {draft.global_stats.total_caisses}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Items offerts
              </Text>
              <Text fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {draft.global_stats.total_offered_item_count}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Patients soignés
              </Text>
              <Text fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {draft.global_stats.total_patients_soignes}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Shérifs soignés
              </Text>
              <Text fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {draft.global_stats.total_sherifs}
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Palefreniers soignés
              </Text>
              <Text fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {draft.global_stats.total_palefreniers}
              </Text>
            </div>
          </SimpleGrid>

          <Divider
            my="md"
            label="Montants"
            labelPosition="left"
            color="var(--mantine-color-default-border)"
          />

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 2 }} spacing="md">
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Total virements (caisses + soins patients)
              </Text>
              <Text fw={600} size="md" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {draft.global_stats.total_employee_payout_usd.toFixed(2)} $
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Marge (bénéfice) sur caisses
              </Text>
              <Text fw={600} size="md" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {draft.global_stats.total_benefit_usd.toFixed(2)} $
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Montant soins patients
              </Text>
              <Text fw={600} size="md" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {(draft.global_stats.total_patients_soignes * draft.patient_care_price_usd).toFixed(2)} $
              </Text>
            </div>
            <div>
              <Text size="sm" c="dimmed" mb={4}>
                Valeur totale des items offerts
              </Text>
              <Text fw={600} size="md" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {draft.global_stats.total_offered_retail_value_usd.toFixed(2)} $
              </Text>
            </div>
          </SimpleGrid>
        </div>
      </Stack>
    </Paper>
  );
}

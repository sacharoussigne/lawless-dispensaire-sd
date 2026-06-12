'use client';

import { useEffect, useState } from 'react';
import { Button, Divider, NumberInput, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import type { WeeklyActivityFieldVisibility } from '@/lib/dispensaryWeeklyActivity/fieldVisibility';
import { emptyWeekdayFlags, type WeekdayFlags, type WeekdayKey } from '@/lib/dispensaryWeeklyActivity/weekdayFlags';
import type { WeeklyActivityWeekBounds } from '@/lib/dispensaryWeeklyActivity/queryKeys';
import { DayFlagFields } from './weeklyActivityUtils';
import {
  useUpdateWeeklyActivityMutation,
  type WeeklyActivityListItem,
} from './hooks/useWeeklyActivityQueries';

type EditWeeklyActivityModalProps = {
  row: WeeklyActivityListItem | null;
  onClose: () => void;
  canEditAll: boolean;
  fieldVisibility: WeeklyActivityFieldVisibility;
  weekBounds: WeeklyActivityWeekBounds;
};

export function EditWeeklyActivityModal({
  row,
  onClose,
  canEditAll,
  fieldVisibility,
  weekBounds,
}: EditWeeklyActivityModalProps) {
  const updateMutation = useUpdateWeeklyActivityMutation();

  const [eChestFlags, setEChestFlags] = useState<WeekdayFlags>(() => emptyWeekdayFlags());
  const [ePresenceFlags, setEPresenceFlags] = useState<WeekdayFlags>(() => emptyWeekdayFlags());
  const [eSheriff, setESheriff] = useState(0);
  const [ePatients, setEPatients] = useState(0);
  const [eInfusions, setEInfusions] = useState(0);
  const [ePoppy, setEPoppy] = useState(0);
  const [eDisplayName, setEDisplayName] = useState('');

  const hasWeeklyScheduleFields = fieldVisibility.chestDays || fieldVisibility.presenceDays;
  const hasWeeklyCounterFields =
    fieldVisibility.sherifCount ||
    fieldVisibility.patientsCount ||
    fieldVisibility.infusionsCount ||
    fieldVisibility.poppyMilkCount;

  useEffect(() => {
    if (!row) return;
    setEChestFlags({ ...row.chestDays });
    setEPresenceFlags({ ...row.presenceDays });
    setESheriff(row.sherifCount);
    setEPatients(row.patientsCount);
    setEInfusions(row.infusionsCount);
    setEPoppy(row.poppyMilkCount);
    setEDisplayName(row.displayName);
  }, [row]);

  const submitEdit = async () => {
    if (!row) return;
    const base = {
      id: row.id,
      ...(fieldVisibility.chestDays ? { chestDays: eChestFlags } : {}),
      ...(fieldVisibility.presenceDays ? { presenceDays: ePresenceFlags } : {}),
      ...(fieldVisibility.sherifCount ? { sherifCount: eSheriff } : {}),
      ...(fieldVisibility.patientsCount ? { patientsCount: ePatients } : {}),
      ...(fieldVisibility.infusionsCount ? { infusionsCount: eInfusions } : {}),
      ...(fieldVisibility.poppyMilkCount ? { poppyMilkCount: ePoppy } : {}),
    };
    await updateMutation.mutateAsync({
      payload: canEditAll
        ? { ...base, displayName: eDisplayName.trim() || row.displayName }
        : base,
      weekBounds,
    });
    onClose();
  };

  return (
    <AppModal
      opened={row !== null}
      onClose={onClose}
      title="Modifier l’activité"
      footer={
        <AppModalFooter>
          <Button variant="subtle" color="slate" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={updateMutation.isPending} onClick={() => void submitEdit()}>
            Enregistrer
          </Button>
        </AppModalFooter>
      }
    >
      {row && (
        <Stack gap="lg">
          <Text size="sm" fw={500}>
            {row.resolvedDisplayName}
          </Text>
          {canEditAll && (
            <TextInput
              label="Nom affiché"
              value={eDisplayName}
              onChange={(e) => setEDisplayName(e.currentTarget.value)}
            />
          )}

          {fieldVisibility.chestDays && (
            <DayFlagFields
              title="Caisses (par jour de semaine)"
              flags={eChestFlags}
              onToggle={(key: WeekdayKey, value: boolean) =>
                setEChestFlags((p) => ({ ...p, [key]: value }))
              }
            />
          )}
          {fieldVisibility.presenceDays && (
            <DayFlagFields
              title="Présences (par jour)"
              flags={ePresenceFlags}
              onToggle={(key: WeekdayKey, value: boolean) =>
                setEPresenceFlags((p) => ({ ...p, [key]: value }))
              }
            />
          )}

          {hasWeeklyCounterFields && (
            <>
              {hasWeeklyScheduleFields && <Divider />}
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {fieldVisibility.sherifCount && (
                  <NumberInput
                    label="Shérifs"
                    value={eSheriff}
                    onChange={(v) => setESheriff(Number(v) || 0)}
                    min={0}
                  />
                )}
                {fieldVisibility.patientsCount && (
                  <NumberInput
                    label="Patients"
                    value={ePatients}
                    onChange={(v) => setEPatients(Number(v) || 0)}
                    min={0}
                  />
                )}
                {fieldVisibility.infusionsCount && (
                  <NumberInput
                    label="Infusions"
                    value={eInfusions}
                    onChange={(v) => setEInfusions(Number(v) || 0)}
                    min={0}
                  />
                )}
                {fieldVisibility.poppyMilkCount && (
                  <NumberInput
                    label="Lait de pavot"
                    value={ePoppy}
                    onChange={(v) => setEPoppy(Number(v) || 0)}
                    min={0}
                  />
                )}
              </SimpleGrid>
            </>
          )}
        </Stack>
      )}
    </AppModal>
  );
}

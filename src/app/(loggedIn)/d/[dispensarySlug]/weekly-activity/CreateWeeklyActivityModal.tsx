'use client';

import { useState } from 'react';
import {
  Button,
  Divider,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { AppModal, AppModalFooter } from '@/app/_components/AppModal/AppModal';
import { WeekNavigation } from '@/app/_components/WeekNavigation/WeekNavigation';
import { addParisWeeks, getBankWeekBounds } from '@/lib/bankWeek';
import type { WeeklyActivityFieldVisibility } from '@/lib/dispensaryWeeklyActivity/fieldVisibility';
import { emptyWeekdayFlags, type WeekdayFlags, type WeekdayKey } from '@/lib/dispensaryWeeklyActivity/weekdayFlags';
import { DayFlagFields } from './weeklyActivityUtils';
import {
  useCreateWeeklyActivityMutation,
  useWeeklyActivityTargets,
  type WeeklyActivityTargetUser,
} from './hooks/useWeeklyActivityQueries';

type CreateWeeklyActivityModalProps = {
  opened: boolean;
  onClose: () => void;
  canEditAll: boolean;
  defaultDisplayName: string;
  defaultWeekMonday: Date;
  fieldVisibility: WeeklyActivityFieldVisibility;
};

export function CreateWeeklyActivityModal({
  opened,
  onClose,
  canEditAll,
  defaultDisplayName,
  defaultWeekMonday,
  fieldVisibility,
}: CreateWeeklyActivityModalProps) {
  const createMutation = useCreateWeeklyActivityMutation();
  const { data: targetUsers = [] } = useWeeklyActivityTargets(opened && canEditAll);

  const [cWeekDateValue, setCWeekDateValue] = useState<Date | null>(defaultWeekMonday);
  const [cTargetUserId, setCTargetUserId] = useState<string | null>(null);
  const [cDisplayName, setCDisplayName] = useState('');
  const [cChestFlags, setCChestFlags] = useState<WeekdayFlags>(() => emptyWeekdayFlags());
  const [cPresenceFlags, setCPresenceFlags] = useState<WeekdayFlags>(() => emptyWeekdayFlags());
  const [cSheriff, setCSheriff] = useState(0);
  const [cPatients, setCPatients] = useState(0);
  const [cInfusions, setCInfusions] = useState(0);
  const [cPoppy, setCPoppy] = useState(0);

  const hasWeeklyScheduleFields = fieldVisibility.chestDays || fieldVisibility.presenceDays;
  const hasWeeklyCounterFields =
    fieldVisibility.sherifCount ||
    fieldVisibility.patientsCount ||
    fieldVisibility.infusionsCount ||
    fieldVisibility.poppyMilkCount;

  const createWeekBounds = getBankWeekBounds(cWeekDateValue ?? defaultWeekMonday);

  const resetForm = () => {
    setCWeekDateValue(defaultWeekMonday);
    setCTargetUserId(null);
    setCDisplayName('');
    setCChestFlags(emptyWeekdayFlags());
    setCPresenceFlags(emptyWeekdayFlags());
    setCSheriff(0);
    setCPatients(0);
    setCInfusions(0);
    setCPoppy(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTargetChange = (id: string | null, users: WeeklyActivityTargetUser[]) => {
    setCTargetUserId(id);
    const user = users.find((t) => t.id === id);
    if (user) setCDisplayName(user.discordDisplayName);
  };

  const submitCreate = async () => {
    if (!cWeekDateValue) {
      notifications.show({ title: 'Période', message: 'Choisissez une semaine', color: 'amber' });
      return;
    }
    if (canEditAll && !cTargetUserId) {
      notifications.show({ title: 'Médecin', message: 'Sélectionnez un utilisateur', color: 'amber' });
      return;
    }
    const { start, end } = getBankWeekBounds(cWeekDateValue);
    const payload = {
      periodStart: start,
      periodEnd: end,
      chestDays: fieldVisibility.chestDays ? cChestFlags : emptyWeekdayFlags(),
      presenceDays: fieldVisibility.presenceDays ? cPresenceFlags : emptyWeekdayFlags(),
      sherifCount: fieldVisibility.sherifCount ? cSheriff : 0,
      patientsCount: fieldVisibility.patientsCount ? cPatients : 0,
      infusionsCount: fieldVisibility.infusionsCount ? cInfusions : 0,
      poppyMilkCount: fieldVisibility.poppyMilkCount ? cPoppy : 0,
      ...(canEditAll && cTargetUserId
        ? {
            targetUserId: cTargetUserId,
            ...(cDisplayName.trim() ? { displayName: cDisplayName.trim() } : {}),
          }
        : {}),
    };

    await createMutation.mutateAsync({
      payload,
      weekBounds: { periodStart: start, periodEnd: end },
    });
    handleClose();
  };

  return (
    <AppModal
      opened={opened}
      onClose={handleClose}
      title="Nouvelle activité"
      footer={
        <AppModalFooter>
          <Button variant="subtle" color="slate" onClick={handleClose}>
            Annuler
          </Button>
          <Button loading={createMutation.isPending} onClick={() => void submitCreate()}>
            Créer
          </Button>
        </AppModalFooter>
      }
    >
      <Stack gap="lg">
        {canEditAll && (
          <>
            <div>
              <Text fw={600} size="sm" mb="xs">
                Médecin
              </Text>
              <Select
                label="Utilisateur intranet"
                description="Comptes avec Discord lié uniquement."
                placeholder="Choisir un utilisateur"
                data={targetUsers.map((u) => ({ value: u.id, label: u.discordDisplayName }))}
                value={cTargetUserId}
                onChange={(id) => handleTargetChange(id, targetUsers)}
                searchable
                nothingFoundMessage="Aucun résultat"
                required
              />
              <TextInput
                label="Pseudo Discord"
                description="Par défaut le dernier pseudo Discord connu ; vous pouvez le personnaliser (RP, etc.)."
                value={cDisplayName}
                onChange={(e) => setCDisplayName(e.currentTarget.value)}
                mt="sm"
              />
            </div>
            <Divider />
          </>
        )}
        {!canEditAll && (
          <>
            <Text size="sm" c="dimmed">
              Entrée pour <Text span fw={500}>{defaultDisplayName}</Text> (compte Discord lié requis).
            </Text>
            <Divider />
          </>
        )}

        <div>
          <Text fw={600} size="sm" mb="xs">
            Période
          </Text>
          <Text size="xs" c="dimmed" mb="sm">
            Semaine Europe/Paris : choisissez n’importe quel jour de la semaine cible.
          </Text>
          {cWeekDateValue && (
            <WeekNavigation
              weekStart={createWeekBounds.start}
              weekEnd={createWeekBounds.end}
              weekDateValue={cWeekDateValue}
              onWeekChange={(d) => {
                if (d) setCWeekDateValue(d);
              }}
              onPreviousWeek={() => setCWeekDateValue((prev) => (prev ? addParisWeeks(prev, -1) : prev))}
              onNextWeek={() => setCWeekDateValue((prev) => (prev ? addParisWeeks(prev, 1) : prev))}
            />
          )}
        </div>

        {hasWeeklyScheduleFields && (
          <>
            <Divider />
            {fieldVisibility.chestDays && (
              <DayFlagFields
                title="Caisses (par jour de semaine)"
                flags={cChestFlags}
                onToggle={(key: WeekdayKey, value: boolean) =>
                  setCChestFlags((p) => ({ ...p, [key]: value }))
                }
              />
            )}
            {fieldVisibility.presenceDays && (
              <DayFlagFields
                title="Présences (par jour)"
                flags={cPresenceFlags}
                onToggle={(key: WeekdayKey, value: boolean) =>
                  setCPresenceFlags((p) => ({ ...p, [key]: value }))
                }
              />
            )}
          </>
        )}

        {hasWeeklyCounterFields && (
          <>
            {hasWeeklyScheduleFields && <Divider />}
            <div>
              <Text fw={600} size="sm" mb="xs">
                Compteurs
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {fieldVisibility.sherifCount && (
                  <NumberInput
                    label="Shérifs"
                    value={cSheriff}
                    onChange={(v) => setCSheriff(Number(v) || 0)}
                    min={0}
                  />
                )}
                {fieldVisibility.patientsCount && (
                  <NumberInput
                    label="Patients"
                    value={cPatients}
                    onChange={(v) => setCPatients(Number(v) || 0)}
                    min={0}
                  />
                )}
                {fieldVisibility.infusionsCount && (
                  <NumberInput
                    label="Infusions"
                    value={cInfusions}
                    onChange={(v) => setCInfusions(Number(v) || 0)}
                    min={0}
                  />
                )}
                {fieldVisibility.poppyMilkCount && (
                  <NumberInput
                    label="Lait de pavot"
                    value={cPoppy}
                    onChange={(v) => setCPoppy(Number(v) || 0)}
                    min={0}
                  />
                )}
              </SimpleGrid>
            </div>
          </>
        )}
      </Stack>
    </AppModal>
  );
}

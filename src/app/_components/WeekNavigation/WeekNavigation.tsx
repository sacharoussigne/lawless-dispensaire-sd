'use client';

import { ActionIcon, Group, Text } from '@mantine/core';
import { DatePickerInput, DatesProvider } from '@mantine/dates';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { formatDate, parsePickerDate } from '@/lib/date';
import dayjs from '@/lib/dayjs';

interface WeekNavigationProps {
  weekStart: Date;
  weekEnd: Date;
  weekDateValue: Date | null;
  onWeekChange: (date: Date | null) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  loading?: boolean;
}

export function WeekNavigation({
  weekStart,
  weekEnd,
  weekDateValue,
  onWeekChange,
  onPreviousWeek,
  onNextWeek,
  loading = false,
}: WeekNavigationProps) {
  const weekRange = `${dayjs(weekStart).tz('Europe/Paris').format('D MMM')} - ${dayjs(weekEnd).tz('Europe/Paris').format('D MMM YYYY')}`;
  const pickerValue = weekDateValue ? formatDate(weekDateValue) : null;

  return (
    <DatesProvider settings={{ locale: 'fr' }}>
      <Group align="center" wrap="nowrap" gap="md">
        <ActionIcon
          variant="light"
          onClick={onPreviousWeek}
          disabled={loading}
          size="md"
          radius="md"
        >
          <IconChevronLeft size={18} />
        </ActionIcon>
        <Group gap="xs" align="center">
          <Text size="sm" fw={500} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
            Semaine du
          </Text>
          <DatePickerInput
            value={pickerValue}
            onChange={(date) => {
              onWeekChange(parsePickerDate(date as Date | string | null));
            }}
            placeholder="Sélectionner le lundi"
            valueFormat="D MMMM YYYY"
            style={{ width: 180 }}
            clearable={false}
            radius="md"
            size="sm"
          />
        </Group>
        <ActionIcon
          variant="light"
          onClick={onNextWeek}
          disabled={loading}
          size="md"
          radius="md"
        >
          <IconChevronRight size={18} />
        </ActionIcon>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <Text size="xs" c="dimmed" mb={2}>
            Période
          </Text>
          <Text size="sm" fw={500}>
            {weekRange}
          </Text>
        </div>
      </Group>
    </DatesProvider>
  );
}

'use client';

import { Select } from '@mantine/core';
import type { AgendaSummaryDTO } from '@/types/agenda';

interface AgendaSelectorProps {
  agendas: AgendaSummaryDTO[];
  value: string | null;
  onChange: (agendaId: string) => void;
}

export function AgendaSelector({ agendas, value, onChange }: AgendaSelectorProps) {
  if (agendas.length <= 1) {
    return null;
  }

  return (
    <Select
      data={agendas.map((a) => ({ value: a.id, label: a.name }))}
      value={value}
      onChange={(v) => v && onChange(v)}
      w={260}
    />
  );
}

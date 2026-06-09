import type { AgendaAccessLevel } from '@prisma/client';

export type AgendaMemberUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type AgendaMemberDTO = {
  id: string;
  userId: string;
  accessLevel: AgendaAccessLevel;
  user: AgendaMemberUser;
};

export type AgendaSummaryDTO = {
  id: string;
  name: string;
  description: string | null;
  accessLevel: AgendaAccessLevel | null;
  memberCount: number;
};

export type AgendaEventParticipantDTO = {
  id: string;
  userId: string;
  user: AgendaMemberUser;
};

export type AgendaEventTodoTaskDTO = {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: Date | null;
  order: number;
};

export type AgendaEventDTO = {
  id: string;
  agendaId: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  createdById: string | null;
  participants: AgendaEventParticipantDTO[];
  todoTasks: AgendaEventTodoTaskDTO[];
  isParticipant: boolean;
  agendaName: string;
};

export type AgendaTodoTaskDTO = {
  id: string;
  categoryId: string;
  title: string;
  description: string | null;
  completed: boolean;
  completedAt: Date | null;
  order: number;
};

export type AgendaTodoCategoryDTO = {
  id: string;
  listId: string;
  name: string;
  order: number;
  tasks: AgendaTodoTaskDTO[];
};

export type AgendaTodoListDTO = {
  id: string;
  agendaId: string;
  name: string;
  order: number;
  categories: AgendaTodoCategoryDTO[];
};

export const AGENDA_ACCESS_LEVELS: AgendaAccessLevel[] = ['OWNER', 'WRITE', 'READ'];

export function agendaAccessLevelLabel(level: AgendaAccessLevel): string {
  switch (level) {
    case 'OWNER':
      return 'Propriétaire';
    case 'WRITE':
      return 'Écriture';
    case 'READ':
      return 'Lecture';
    default:
      return level;
  }
}

export function canReadAgenda(level: AgendaAccessLevel | null | undefined): boolean {
  return level === 'OWNER' || level === 'WRITE' || level === 'READ';
}

export function canWriteAgenda(level: AgendaAccessLevel | null | undefined): boolean {
  return level === 'OWNER' || level === 'WRITE';
}

export function canOwnAgenda(level: AgendaAccessLevel | null | undefined): boolean {
  return level === 'OWNER';
}

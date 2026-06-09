import { z } from 'zod';

export const agendaAccessLevelSchema = z.enum(['OWNER', 'WRITE', 'READ']);

export const createAgendaSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis').max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  ownerUserId: z.string().min(1, 'Le propriétaire est requis'),
});

export const updateAgendaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, 'Le nom est requis').max(120),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const deleteAgendaSchema = z.object({
  id: z.string().uuid(),
});

export const upsertAgendaMemberSchema = z.object({
  agendaId: z.string().uuid(),
  userId: z.string().min(1),
  accessLevel: agendaAccessLevelSchema,
});

export const removeAgendaMemberSchema = z.object({
  agendaId: z.string().uuid(),
  userId: z.string().min(1),
});

export const createAgendaEventSchema = z.object({
  agendaId: z.string().uuid(),
  title: z.string().trim().min(1, 'Le titre est requis').max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  startDate: z.string().min(1),
  startTime: z.string().optional(),
  endDate: z.string().min(1),
  endTime: z.string().optional(),
  allDay: z.boolean().default(false),
  participantUserIds: z.array(z.string().min(1)).default([]),
});

export const updateAgendaEventSchema = createAgendaEventSchema.extend({
  id: z.string().uuid(),
});

export const deleteAgendaEventSchema = z.object({
  id: z.string().uuid(),
});

export const listAgendaEventsSchema = z.object({
  agendaId: z.string().uuid().optional(),
  rangeStart: z.string().datetime(),
  rangeEnd: z.string().datetime(),
});

export const createTodoListSchema = z.object({
  agendaId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
});

export const updateTodoListSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
});

export const deleteTodoListSchema = z.object({
  id: z.string().uuid(),
});

export const createTodoCategorySchema = z.object({
  listId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
});

export const updateTodoCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
});

export const deleteTodoCategorySchema = z.object({
  id: z.string().uuid(),
});

export const createTodoTaskSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const updateTodoTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  completed: z.boolean().optional(),
});

export const deleteTodoTaskSchema = z.object({
  id: z.string().uuid(),
});

export const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    order: z.number().int(),
  })),
});

export const createEventTodoTaskSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(2000).optional().nullable(),
});

export const updateEventTodoTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  completed: z.boolean().optional(),
});

export const deleteEventTodoTaskSchema = z.object({
  id: z.string().uuid(),
});

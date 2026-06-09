'use server';

import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import type { AgendaTodoListDTO } from '@/types/agenda';
import {
  createTodoListSchema,
  updateTodoListSchema,
  deleteTodoListSchema,
  createTodoCategorySchema,
  updateTodoCategorySchema,
  deleteTodoCategorySchema,
  createTodoTaskSchema,
  updateTodoTaskSchema,
  deleteTodoTaskSchema,
  reorderSchema,
} from '@/app/_actions/agenda/schemas';
import {
  getAgendaSessionContext,
  guardAgendaRead,
  guardAgendaWrite,
  resolveAgendaIdFromTodoListId,
  resolveAgendaIdFromTodoCategoryId,
  resolveAgendaIdFromTodoTaskId,
} from '@/app/_actions/agenda/internals';

const COMPLETED_PREVIEW_LIMIT = 10;

const listInclude = {
  categories: {
    orderBy: { order: 'asc' as const },
    include: {
      tasks: { orderBy: { order: 'asc' as const } },
    },
  },
};

function mapTodoList(list: {
  id: string;
  agendaId: string;
  name: string;
  order: number;
  categories: {
    id: string;
    listId: string;
    name: string;
    order: number;
    tasks: {
      id: string;
      categoryId: string;
      title: string;
      description: string | null;
      completed: boolean;
      completedAt: Date | null;
      order: number;
    }[];
  }[];
}): AgendaTodoListDTO {
  return {
    id: list.id,
    agendaId: list.agendaId,
    name: list.name,
    order: list.order,
    categories: list.categories.map((c) => ({
      id: c.id,
      listId: c.listId,
      name: c.name,
      order: c.order,
      tasks: c.tasks,
    })),
  };
}

function filterTasksForMainView(list: AgendaTodoListDTO): AgendaTodoListDTO {
  return {
    ...list,
    categories: list.categories.map((category) => {
      const active = category.tasks.filter((t) => !t.completed);
      const completed = category.tasks
        .filter((t) => t.completed)
        .sort((a, b) => {
          const aTime = a.completedAt?.getTime() ?? 0;
          const bTime = b.completedAt?.getTime() ?? 0;
          return bTime - aTime;
        })
        .slice(0, COMPLETED_PREVIEW_LIMIT);
      return {
        ...category,
        tasks: [...active, ...completed],
      };
    }),
  };
}

export async function listAgendaTodoLists(
  dispensarySlug: string,
  agendaId: string,
  options?: { archives?: boolean },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const guard = await guardAgendaRead(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    const lists = await prisma.agendaTodoList.findMany({
      where: {
        agendaId,
        agenda: tenantWhere(ctx.tenant.dispensaryId),
      },
      include: listInclude,
      orderBy: { order: 'asc' },
    });

    const mapped = lists.map(mapTodoList);

    if (options?.archives) {
      const archived = mapped.map((list) => ({
        ...list,
        categories: list.categories.map((c) => ({
          ...c,
          tasks: c.tasks
            .filter((t) => t.completed)
            .sort((a, b) => {
              const aTime = a.completedAt?.getTime() ?? 0;
              const bTime = b.completedAt?.getTime() ?? 0;
              return bTime - aTime;
            }),
        })).filter((c) => c.tasks.length > 0),
      })).filter((l) => l.categories.length > 0);

      return { status: 200, data: archived };
    }

    return { status: 200, data: mapped.map(filterTasksForMainView) };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du chargement des listes');
  }
}

export async function createAgendaTodoList(
  dispensarySlug: string,
  data: { agendaId: string; name: string },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = createTodoListSchema.parse(data);

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      validated.agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    const maxOrder = await prisma.agendaTodoList.aggregate({
      where: { agendaId: validated.agendaId },
      _max: { order: true },
    });

    const list = await prisma.agendaTodoList.create({
      data: {
        agendaId: validated.agendaId,
        name: validated.name,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      include: listInclude,
    });

    return { status: 201, data: mapTodoList(list) };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de la liste');
  }
}

export async function updateAgendaTodoList(
  dispensarySlug: string,
  data: { id: string; name: string },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = updateTodoListSchema.parse(data);
    const agendaId = await resolveAgendaIdFromTodoListId(
      ctx.tenant.dispensaryId,
      validated.id,
    );
    if (!agendaId) {
      return { status: 404, error: 'Liste introuvable' };
    }

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    const list = await prisma.agendaTodoList.update({
      where: { id: validated.id },
      data: { name: validated.name },
      include: listInclude,
    });

    return { status: 200, data: mapTodoList(list) };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour de la liste');
  }
}

export async function deleteAgendaTodoList(dispensarySlug: string, id: string) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = deleteTodoListSchema.parse({ id });
    const agendaId = await resolveAgendaIdFromTodoListId(
      ctx.tenant.dispensaryId,
      validated.id,
    );
    if (!agendaId) {
      return { status: 404, error: 'Liste introuvable' };
    }

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    await prisma.agendaTodoList.delete({ where: { id: validated.id } });

    return { status: 200 };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la liste');
  }
}

export async function createAgendaTodoCategory(
  dispensarySlug: string,
  data: { listId: string; name: string },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = createTodoCategorySchema.parse(data);
    const agendaId = await resolveAgendaIdFromTodoListId(
      ctx.tenant.dispensaryId,
      validated.listId,
    );
    if (!agendaId) {
      return { status: 404, error: 'Liste introuvable' };
    }

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    const maxOrder = await prisma.agendaTodoCategory.aggregate({
      where: { listId: validated.listId },
      _max: { order: true },
    });

    const category = await prisma.agendaTodoCategory.create({
      data: {
        listId: validated.listId,
        name: validated.name,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      include: { tasks: { orderBy: { order: 'asc' } } },
    });

    return { status: 201, data: category };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de la catégorie');
  }
}

export async function updateAgendaTodoCategory(
  dispensarySlug: string,
  data: { id: string; name: string },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = updateTodoCategorySchema.parse(data);
    const agendaId = await resolveAgendaIdFromTodoCategoryId(
      ctx.tenant.dispensaryId,
      validated.id,
    );
    if (!agendaId) {
      return { status: 404, error: 'Catégorie introuvable' };
    }

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    const category = await prisma.agendaTodoCategory.update({
      where: { id: validated.id },
      data: { name: validated.name },
      include: { tasks: { orderBy: { order: 'asc' } } },
    });

    return { status: 200, data: category };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour de la catégorie');
  }
}

export async function deleteAgendaTodoCategory(dispensarySlug: string, id: string) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = deleteTodoCategorySchema.parse({ id });
    const agendaId = await resolveAgendaIdFromTodoCategoryId(
      ctx.tenant.dispensaryId,
      validated.id,
    );
    if (!agendaId) {
      return { status: 404, error: 'Catégorie introuvable' };
    }

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    await prisma.agendaTodoCategory.delete({ where: { id: validated.id } });

    return { status: 200 };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la catégorie');
  }
}

export async function createAgendaTodoTask(
  dispensarySlug: string,
  data: { categoryId: string; title: string; description?: string | null },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = createTodoTaskSchema.parse(data);
    const agendaId = await resolveAgendaIdFromTodoCategoryId(
      ctx.tenant.dispensaryId,
      validated.categoryId,
    );
    if (!agendaId) {
      return { status: 404, error: 'Catégorie introuvable' };
    }

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    const maxOrder = await prisma.agendaTodoTask.aggregate({
      where: { categoryId: validated.categoryId },
      _max: { order: true },
    });

    const task = await prisma.agendaTodoTask.create({
      data: {
        categoryId: validated.categoryId,
        title: validated.title,
        description: validated.description ?? null,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    return { status: 201, data: task };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de la tâche');
  }
}

export async function updateAgendaTodoTask(
  dispensarySlug: string,
  data: {
    id: string;
    title?: string;
    description?: string | null;
    completed?: boolean;
  },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = updateTodoTaskSchema.parse(data);
    const agendaId = await resolveAgendaIdFromTodoTaskId(
      ctx.tenant.dispensaryId,
      validated.id,
    );
    if (!agendaId) {
      return { status: 404, error: 'Tâche introuvable' };
    }

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    const updateData: {
      title?: string;
      description?: string | null;
      completed?: boolean;
      completedAt?: Date | null;
    } = {};

    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) {
      updateData.description = validated.description;
    }
    if (validated.completed !== undefined) {
      updateData.completed = validated.completed;
      updateData.completedAt = validated.completed ? new Date() : null;
    }

    const task = await prisma.agendaTodoTask.update({
      where: { id: validated.id },
      data: updateData,
    });

    return { status: 200, data: task };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la mise à jour de la tâche');
  }
}

export async function deleteAgendaTodoTask(dispensarySlug: string, id: string) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = deleteTodoTaskSchema.parse({ id });
    const agendaId = await resolveAgendaIdFromTodoTaskId(
      ctx.tenant.dispensaryId,
      validated.id,
    );
    if (!agendaId) {
      return { status: 404, error: 'Tâche introuvable' };
    }

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    const task = await prisma.agendaTodoTask.findUnique({
      where: { id: validated.id },
      select: { completed: true },
    });

    if (!task) {
      return { status: 404, error: 'Tâche introuvable' };
    }

    await prisma.agendaTodoTask.delete({ where: { id: validated.id } });

    return { status: 200 };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la tâche');
  }
}

export async function reorderAgendaTodoCategories(
  dispensarySlug: string,
  data: { items: { id: string; order: number }[] },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = reorderSchema.parse(data);
    if (validated.items.length === 0) {
      return { status: 200, data: { success: true } };
    }

    const agendaId = await resolveAgendaIdFromTodoCategoryId(
      ctx.tenant.dispensaryId,
      validated.items[0].id,
    );
    if (!agendaId) {
      return { status: 404, error: 'Catégorie introuvable' };
    }

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    await Promise.all(
      validated.items.map(({ id, order }) =>
        prisma.agendaTodoCategory.update({
          where: { id },
          data: { order },
        }),
      ),
    );

    return { status: 200, data: { success: true } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du réordonnancement');
  }
}

export async function reorderAgendaTodoTasks(
  dispensarySlug: string,
  data: { items: { id: string; order: number }[] },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = reorderSchema.parse(data);
    if (validated.items.length === 0) {
      return { status: 200, data: { success: true } };
    }

    const agendaId = await resolveAgendaIdFromTodoTaskId(
      ctx.tenant.dispensaryId,
      validated.items[0].id,
    );
    if (!agendaId) {
      return { status: 404, error: 'Tâche introuvable' };
    }

    const guard = await guardAgendaWrite(
      ctx.tenant.dispensaryId,
      agendaId,
      ctx.session,
      ctx.tenant.effectiveRole,
    );
    if (!guard.ok) {
      return { status: guard.status, error: guard.error };
    }

    await Promise.all(
      validated.items.map(({ id, order }) =>
        prisma.agendaTodoTask.update({
          where: { id },
          data: { order },
        }),
      ),
    );

    return { status: 200, data: { success: true } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du réordonnancement');
  }
}

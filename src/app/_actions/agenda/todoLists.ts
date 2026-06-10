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
  moveTodoTaskSchema,
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
import {
  compareTodoTasksByCompletedAtDesc,
  isTodoTaskArchived,
} from '@/lib/agenda/todoArchive';

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

function filterTasksForMainView(
  list: AgendaTodoListDTO,
  nowMs: number = Date.now(),
): AgendaTodoListDTO {
  return {
    ...list,
    categories: list.categories.map((category) => {
      const active = category.tasks.filter((t) => !t.completed);
      const recentlyCompleted = category.tasks
        .filter((t) => t.completed && !isTodoTaskArchived(t, nowMs))
        .sort(compareTodoTasksByCompletedAtDesc);
      return {
        ...category,
        tasks: [...active, ...recentlyCompleted],
      };
    }),
  };
}

function filterTasksForArchives(
  list: AgendaTodoListDTO,
  nowMs: number = Date.now(),
): AgendaTodoListDTO {
  return {
    ...list,
    categories: list.categories
      .map((category) => ({
        ...category,
        tasks: category.tasks
          .filter((t) => isTodoTaskArchived(t, nowMs))
          .sort(compareTodoTasksByCompletedAtDesc),
      }))
      .filter((category) => category.tasks.length > 0),
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
    const nowMs = Date.now();

    if (options?.archives) {
      const archived = mapped
        .map((list) => filterTasksForArchives(list, nowMs))
        .filter((list) => list.categories.length > 0);

      return { status: 200, data: archived };
    }

    return { status: 200, data: mapped.map((list) => filterTasksForMainView(list, nowMs)) };
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
    categoryId?: string;
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

    if (validated.categoryId !== undefined) {
      const currentTask = await prisma.agendaTodoTask.findUnique({
        where: { id: validated.id },
        select: {
          category: { select: { listId: true } },
        },
      });
      if (!currentTask) {
        return { status: 404, error: 'Tâche introuvable' };
      }

      const targetCategory = await prisma.agendaTodoCategory.findFirst({
        where: {
          id: validated.categoryId,
          list: {
            agenda: tenantWhere(ctx.tenant.dispensaryId),
          },
        },
        select: { id: true, listId: true },
      });

      if (!targetCategory) {
        return { status: 404, error: 'Catégorie introuvable' };
      }

      if (targetCategory.listId !== currentTask.category.listId) {
        return { status: 400, error: 'La catégorie doit appartenir à la même liste' };
      }
    }

    const updateData: {
      title?: string;
      description?: string | null;
      completed?: boolean;
      completedAt?: Date | null;
      categoryId?: string;
    } = {};

    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) {
      updateData.description = validated.description;
    }
    if (validated.completed !== undefined) {
      updateData.completed = validated.completed;
      updateData.completedAt = validated.completed ? new Date() : null;
    }
    if (validated.categoryId !== undefined) {
      updateData.categoryId = validated.categoryId;
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

export async function moveAgendaTodoTask(
  dispensarySlug: string,
  data: {
    taskId: string;
    sourceCategoryId: string;
    targetCategoryId: string;
    sourceOrders: { id: string; order: number }[];
    targetOrders: { id: string; order: number }[];
  },
) {
  try {
    const ctx = await getAgendaSessionContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;

    const validated = moveTodoTaskSchema.parse(data);
    const agendaId = await resolveAgendaIdFromTodoTaskId(
      ctx.tenant.dispensaryId,
      validated.taskId,
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
      where: { id: validated.taskId },
      select: {
        categoryId: true,
        category: { select: { listId: true } },
      },
    });
    if (!task) {
      return { status: 404, error: 'Tâche introuvable' };
    }

    const [sourceCategory, targetCategory] = await Promise.all([
      prisma.agendaTodoCategory.findFirst({
        where: {
          id: validated.sourceCategoryId,
          list: { agenda: tenantWhere(ctx.tenant.dispensaryId) },
        },
        select: { id: true, listId: true },
      }),
      prisma.agendaTodoCategory.findFirst({
        where: {
          id: validated.targetCategoryId,
          list: { agenda: tenantWhere(ctx.tenant.dispensaryId) },
        },
        select: { id: true, listId: true },
      }),
    ]);

    if (!sourceCategory || !targetCategory) {
      return { status: 404, error: 'Catégorie introuvable' };
    }

    if (sourceCategory.listId !== targetCategory.listId) {
      return { status: 400, error: 'La catégorie doit appartenir à la même liste' };
    }

    if (task.category.listId !== sourceCategory.listId) {
      return { status: 400, error: 'La tâche ne fait pas partie de cette liste' };
    }

    if (
      task.categoryId !== validated.sourceCategoryId &&
      task.categoryId !== validated.targetCategoryId
    ) {
      return { status: 409, error: 'La tâche a été modifiée entre-temps' };
    }

    await prisma.$transaction(async (tx) => {
      if (validated.sourceCategoryId !== validated.targetCategoryId) {
        await tx.agendaTodoTask.update({
          where: { id: validated.taskId },
          data: { categoryId: validated.targetCategoryId },
        });
      }

      const orderUpdates = new Map<string, number>();
      for (const item of validated.sourceOrders) {
        orderUpdates.set(item.id, item.order);
      }
      for (const item of validated.targetOrders) {
        orderUpdates.set(item.id, item.order);
      }

      await Promise.all(
        [...orderUpdates.entries()].map(([id, order]) =>
          tx.agendaTodoTask.update({
            where: { id },
            data: { order },
          }),
        ),
      );
    });

    return { status: 200, data: { success: true } };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors du déplacement de la tâche');
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

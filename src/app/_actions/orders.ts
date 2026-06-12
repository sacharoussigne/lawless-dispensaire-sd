'use server';

import { z } from 'zod/v3';
import prisma from '@/lib/prisma';
import { actionErrorParser } from '@/lib/action';
import { requireTenantServerActionContext } from '@/lib/serverActionAuth';
import { tenantWhere } from '@/lib/dispensary/tenantWhere';
import type { OrderStatus } from '@prisma/client';
import type {
  ActiveOrderSummary,
  OrderSummary,
  OrdersPageResult,
  OrderWithRelations,
} from '@/types/orders';
import { calculateOrderPriceFromItems } from '@/lib/orders/calculateOrderPriceFromItems';
import { slugifyOrderText } from '@/lib/orders/slugify';

const ORDER_DETAIL_INCLUDE = {
  company: {
    select: {
      id: true,
      name: true,
    },
  },
  individualCustomer: {
    select: {
      id: true,
      name: true,
    },
  },
  items: {
    include: {
      item: {
        select: {
          id: true,
          name: true,
          price: true,
          weight: true,
        },
      },
    },
  },
} as const;

const ORDER_LIST_INCLUDE = {
  company: {
    select: {
      id: true,
      name: true,
    },
  },
  individualCustomer: {
    select: {
      id: true,
      name: true,
    },
  },
  _count: {
    select: {
      items: true,
    },
  },
} as const;

function serializeOrderForClient(order: {
  price: unknown;
  items: Array<{ item: { price?: unknown } & Record<string, unknown> } & Record<string, unknown>>;
} & Record<string, unknown>): OrderWithRelations {
  return {
    ...order,
    price: order.price != null ? Number(order.price as number) : null,
    items: order.items.map((orderItem) => ({
      ...orderItem,
      item: {
        ...orderItem.item,
        price:
          orderItem.item?.price != null
            ? Number(orderItem.item.price as number)
            : null,
      },
    })),
  } as OrderWithRelations;
}

async function computeOrderPriceFromItemIds(
  dispensaryId: string,
  items: { itemId: string; quantity: number }[]
): Promise<number | null> {
  const itemsWithPrices = await prisma.item.findMany({
    where: {
      id: { in: items.map((item) => item.itemId) },
      ...tenantWhere(dispensaryId),
    },
    select: {
      id: true,
      price: true,
    },
  });

  return calculateOrderPriceFromItems(
    items.map((orderItem) => {
      const item = itemsWithPrices.find((i) => i.id === orderItem.itemId);
      return {
        quantity: orderItem.quantity,
        price: item?.price ?? null,
      };
    })
  );
}

async function resolveOrderPrice(
  dispensaryId: string,
  items: { itemId: string; quantity: number }[],
  clientPrice: number | null | undefined
): Promise<number | null> {
  if (clientPrice !== undefined) {
    return clientPrice;
  }
  return computeOrderPriceFromItemIds(dispensaryId, items);
}

const createOrderSchema = z
  .object({
    name: z.string().max(255, 'Le nom est trop long').optional(),
    status: z
      .enum(['DRAFT', 'LETTER_SENT', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED'])
      .default('DRAFT'),
    type: z.enum(['INCOMING', 'OUTGOING']).default('INCOMING'),
    details: z.string().max(1000, 'Les détails sont trop longs').optional(),
    price: z
      .number()
      .positive('Le prix doit être positif')
      .optional()
      .nullable(),
    companyId: z.string().uuid('ID d\'entreprise invalide').optional(),
    individualCustomerId: z.string().uuid('ID de particulier invalide').optional(),
    companyGroupId: z.string().uuid('ID de groupe invalide').optional().nullable(),
    items: z
      .array(
        z.object({
          itemId: z.string().uuid('ID d\'item invalide'),
          quantity: z.number().int().min(1, 'La quantité doit être au moins 1'),
        })
      )
      .min(1, 'Au moins un objet est requis'),
  })
  .refine(
    (d) =>
      (Boolean(d.companyId) && !d.individualCustomerId) ||
      (!d.companyId && Boolean(d.individualCustomerId)),
    { message: 'Indiquez une entreprise ou un particulier', path: ['companyId'] }
  );

export async function createOrder(
  dispensarySlug: string,
  data: {
    name?: string;
    status?: 'DRAFT' | 'LETTER_SENT' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    type?: 'INCOMING' | 'OUTGOING';
    details?: string;
    price?: number;
    companyId?: string;
    individualCustomerId?: string;
    companyGroupId?: string | null;
    items: { itemId: string; quantity: number }[];
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'orders',
      permission: {
        resource: 'orders',
        action: 'create',
        message: 'Permission refusée : vous n\'avez pas la permission de créer une commande',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = createOrderSchema.parse(data);

    let orderName = validatedData.name;
    if (!orderName) {
      if (validatedData.companyId) {
        const company = await prisma.company.findFirst({
          where: { id: validatedData.companyId, ...tenantWhere(dispensaryId) },
          select: { name: true },
        });

        if (!company) {
          return {
            status: 404,
            error: 'Entreprise introuvable',
          };
        }

        const orderCount = await prisma.order.count({
          where: { companyId: validatedData.companyId, ...tenantWhere(dispensaryId) },
        });

        const sequentialNumber = String(orderCount + 1).padStart(4, '0');
        orderName = `${slugifyOrderText(company.name)}-${sequentialNumber}`;
      } else if (validatedData.individualCustomerId) {
        const customer = await prisma.individualCustomer.findFirst({
          where: { id: validatedData.individualCustomerId, ...tenantWhere(dispensaryId) },
          select: { name: true },
        });

        if (!customer) {
          return {
            status: 404,
            error: 'Particulier introuvable',
          };
        }

        const orderCount = await prisma.order.count({
          where: {
            individualCustomerId: validatedData.individualCustomerId,
            ...tenantWhere(dispensaryId),
          },
        });

        const sequentialNumber = String(orderCount + 1).padStart(4, '0');
        orderName = `${slugifyOrderText(customer.name)}-${sequentialNumber}`;
      }
    }

    const orderPrice = await resolveOrderPrice(
      dispensaryId,
      validatedData.items,
      validatedData.price
    );

    if (!orderName) {
      return {
        status: 400,
        error: 'Le nom de la commande est requis',
      };
    }

    const order = await prisma.order.create({
      data: {
        dispensaryId,
        name: orderName,
        status: validatedData.status,
        type: validatedData.type,
        details: validatedData.details,
        ...(orderPrice !== null && { price: orderPrice }),
        companyId: validatedData.companyId ?? null,
        individualCustomerId: validatedData.individualCustomerId ?? null,
        companyGroupId: validatedData.companyGroupId ?? null,
        items: {
          create: validatedData.items.map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        individualCustomer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      status: 201,
      data: serializeOrderForClient(order),
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la création de la commande');
  }
}

const updateOrderSchema = z.object({
  id: z.string().uuid('ID invalide'),
  name: z.string().min(1, 'Le nom est requis').max(255, 'Le nom est trop long').optional(),
  status: z.enum(['DRAFT', 'LETTER_SENT', 'PROCESSING', 'READY', 'COMPLETED', 'CANCELLED']).optional(),
  type: z.enum(['INCOMING', 'OUTGOING']).optional(),
  details: z.string().max(1000, 'Les détails sont trop longs').optional(),
  price: z
    .number()
    .positive('Le prix doit être positif')
    .optional()
    .nullable(),
  items: z.array(
    z.object({
      itemId: z.string().uuid('ID d\'item invalide'),
      quantity: z.number().int().min(1, 'La quantité doit être au moins 1'),
    })
  ).min(1, 'Au moins un objet est requis').optional(),
});

const deleteOrderSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

const orderStatusValues = [
  'DRAFT',
  'LETTER_SENT',
  'PROCESSING',
  'READY',
  'COMPLETED',
  'CANCELLED',
] as const;

const getOrdersPageSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
  status: z.enum(orderStatusValues).optional().nullable(),
  search: z.string().max(255).optional(),
});

const getOrderByIdSchema = z.object({
  id: z.string().uuid('ID invalide'),
});

const getActiveOrdersForCompanyGroupSchema = z.object({
  companyGroupId: z.string().uuid('ID de groupe invalide'),
});

function serializeOrderSummary(
  order: Omit<OrderSummary, 'price' | 'itemCount'> & {
    price: unknown;
    _count: { items: number };
  },
): OrderSummary {
  const { _count, price, ...rest } = order;
  return {
    ...rest,
    price: price != null ? Number(price as number) : null,
    itemCount: _count.items,
  };
}

async function requireOrdersViewContext(dispensarySlug: string) {
  return requireTenantServerActionContext(dispensarySlug, {
    feature: 'orders',
    permission: {
      resource: 'orders',
      action: 'view',
      message: 'Permission refusée : vous n\'avez pas la permission de voir les commandes',
    },
  });
}

export async function getOrdersPage(
  dispensarySlug: string,
  params: {
    page?: number;
    pageSize?: number;
    status?: (typeof orderStatusValues)[number] | null;
    search?: string;
  } = {},
) {
  try {
    const ctx = await requireOrdersViewContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const { page, pageSize, status, search } = getOrdersPageSchema.parse(params);
    const searchTerm = search?.trim();

    const where = {
      ...tenantWhere(dispensaryId),
      ...(status ? { status } : {}),
      ...(searchTerm
        ? {
            name: {
              contains: searchTerm,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: ORDER_LIST_INCLUDE,
      }),
      prisma.order.count({ where }),
    ]);

    const result: OrdersPageResult = {
      orders: orders.map((order) => serializeOrderSummary(order)),
      totalCount,
      page,
      pageSize,
    };

    return {
      status: 200,
      data: result,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des commandes');
  }
}

export async function getOrderById(dispensarySlug: string, data: { id: string }) {
  try {
    const ctx = await requireOrdersViewContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const { id } = getOrderByIdSchema.parse(data);

    const order = await prisma.order.findFirst({
      where: { id, ...tenantWhere(dispensaryId) },
      include: ORDER_DETAIL_INCLUDE,
    });

    if (!order) {
      return {
        status: 404,
        error: 'Commande non trouvée',
      };
    }

    return {
      status: 200,
      data: serializeOrderForClient(order),
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération de la commande');
  }
}

export async function getActiveOrdersForCompanyGroup(
  dispensarySlug: string,
  data: { companyGroupId: string },
) {
  try {
    const ctx = await requireOrdersViewContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const { companyGroupId } = getActiveOrdersForCompanyGroupSchema.parse(data);

    const group = await prisma.companyGroup.findFirst({
      where: { id: companyGroupId, ...tenantWhere(dispensaryId) },
      select: {
        companies: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!group) {
      return {
        status: 404,
        error: 'Groupe d\'entreprises introuvable',
      };
    }

    const companyIds = group.companies.map((entry) => entry.companyId);

    const orders = await prisma.order.findMany({
      where: {
        ...tenantWhere(dispensaryId),
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        OR: [
          { companyGroupId },
          ...(companyIds.length > 0 ? [{ companyId: { in: companyIds } }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        companyGroupId: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        individualCustomer: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          select: {
            itemId: true,
            quantity: true,
            item: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      status: 200,
      data: orders as ActiveOrderSummary[],
    };
  } catch (error) {
    return actionErrorParser(
      error,
      'Erreur lors de la récupération des commandes actives',
    );
  }
}

/** @deprecated Use getOrdersPage or getOrderById */
export async function getOrders(dispensarySlug: string) {
  try {
    const ctx = await requireOrdersViewContext(dispensarySlug);
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const orders = await prisma.order.findMany({
      where: tenantWhere(dispensaryId),
      orderBy: { createdAt: 'desc' },
      include: ORDER_DETAIL_INCLUDE,
    });

    return {
      status: 200,
      data: orders.map((order) => serializeOrderForClient(order)),
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la récupération des commandes');
  }
}

export async function updateOrder(
  dispensarySlug: string,
  data: {
    id: string;
    name?: string;
    status?: 'DRAFT' | 'LETTER_SENT' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    type?: 'INCOMING' | 'OUTGOING';
    details?: string;
    price?: number | null;
    items?: { itemId: string; quantity: number }[];
  },
) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'orders',
      permission: {
        resource: 'orders',
        action: 'update',
        message: 'Permission refusée : vous n\'avez pas la permission de modifier une commande',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = updateOrderSchema.parse(data);

    const oldOrder = await prisma.order.findFirst({
      where: { id: validatedData.id, ...tenantWhere(dispensaryId) },
      select: {
        status: true,
        type: true,
        items: {
          select: {
            itemId: true,
            quantity: true,
          },
        },
      },
    });

    if (!oldOrder) {
      return {
        status: 404,
        error: 'Commande non trouvée',
      };
    }

    if (oldOrder.status === ('COMPLETED' as OrderStatus)) {
      return {
        status: 403,
        error: 'Les commandes terminées ne peuvent pas être modifiées',
      };
    }

    const itemsToUse = validatedData.items || oldOrder.items.map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
    }));

    const updateData: Record<string, unknown> = {
      name: validatedData.name,
      status: validatedData.status,
      type: validatedData.type,
      details: validatedData.details,
    };

    if (validatedData.price !== undefined || validatedData.items) {
      const orderPrice = await resolveOrderPrice(
        dispensaryId,
        itemsToUse,
        validatedData.price
      );
      updateData.price = orderPrice;
    }

    const order = await prisma.$transaction(async (tx) => {
      if (validatedData.items) {
        await tx.orderItem.deleteMany({
          where: { orderId: validatedData.id },
        });

        updateData.items = {
          create: itemsToUse.map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity,
          })),
        };
      }

      return tx.order.update({
        where: {
          id: validatedData.id,
          ...tenantWhere(dispensaryId),
        },
        data: updateData,
        include: ORDER_DETAIL_INCLUDE,
      });
    });

    const serializedOrder = serializeOrderForClient(order);

    return {
      status: 200,
      data: serializedOrder,
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la modification de la commande');
  }
}

export async function deleteOrder(dispensarySlug: string, data: { id: string }) {
  try {
    const ctx = await requireTenantServerActionContext(dispensarySlug, {
      feature: 'orders',
      permission: {
        resource: 'orders',
        action: 'delete',
        message: 'Permission refusée : vous n\'avez pas la permission de supprimer une commande',
      },
    });
    if (!ctx.ok) return ctx.response;
    const { dispensaryId } = ctx.tenant;

    const validatedData = deleteOrderSchema.parse(data);

    const order = await prisma.order.findFirst({
      where: { id: validatedData.id, ...tenantWhere(dispensaryId) },
      select: { status: true },
    });

    if (!order) {
      return {
        status: 404,
        error: 'Commande non trouvée',
      };
    }

    if (order.status === ('COMPLETED' as OrderStatus)) {
      return {
        status: 403,
        error: 'Les commandes terminées ne peuvent pas être supprimées',
      };
    }

    await prisma.order.delete({
      where: {
        id: validatedData.id,
        ...tenantWhere(dispensaryId),
      },
    });

    return {
      status: 200,
      data: { success: true },
    };
  } catch (error) {
    return actionErrorParser(error, 'Erreur lors de la suppression de la commande');
  }
}

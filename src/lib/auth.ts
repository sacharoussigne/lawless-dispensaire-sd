import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { admin as adminPlugin, openAPI } from 'better-auth/plugins';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { ac, admin, user, employee, inventory_manager, inventory_viewer, private_practitioner, direction } from './auth/permissions';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const total = await prisma.user.count();
          if (total === 1) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: 'admin' },
            });
            return;
          }
          const accessOnCreate =
            process.env.ACCESS_ON_CREATE === 'true' ||
            process.env.ACCESS_ON_CREATE === '1';
          if (accessOnCreate) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: 'employee' },
            });
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies(), openAPI(), adminPlugin({
    ac: ac,
    roles: {
      admin,
      user,
      employee,
      inventory_manager,
      inventory_viewer,
      private_practitioner,
      direction,
    }
  })],
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
    },
  },
});

export const getAuthSession = async () => {
  'use server';

  return await auth.api.getSession({
    headers: await headers(),
  });
};

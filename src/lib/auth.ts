import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { admin as adminPlugin, openAPI } from 'better-auth/plugins';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { ac, admin, user, employee, inventory_manager } from './auth/permissions';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
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

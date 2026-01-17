import { createAuthClient } from 'better-auth/client';
import { adminClient } from "better-auth/client/plugins"
import { ac, admin, user, employee, inventory_manager } from './auth/permissions';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  plugins: [
    adminClient({
      ac: ac,
      roles: {
        admin,
        user,
        employee,
        inventory_manager,
      }
    })
  ]
});

export const signInWithDiscord = async () => {
  const data = await authClient.signIn.social({
    provider: 'discord',
  });
};

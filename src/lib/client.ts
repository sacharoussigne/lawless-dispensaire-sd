import { createAuthClient } from 'better-auth/client';
import { adminClient } from "better-auth/client/plugins"
import {
  ac,
  admin,
  user,
  employee,
  inventory_manager,
  inventory_viewer,
  private_practitioner,
  direction,
} from './auth/permissions';

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
        inventory_viewer,
        private_practitioner,
        direction,
      }
    })
  ]
});

export const signInWithDiscord = async () => {
  await authClient.signIn.social({
    provider: 'discord',
  });
};

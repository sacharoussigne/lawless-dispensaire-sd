import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({});

export const signInWithDiscord = async () => {
  const data = await authClient.signIn.social({
    provider: 'discord',
  });
};

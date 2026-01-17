'use client';

import { Button } from '@mantine/core';
import { authClient } from '@/lib/client';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/auth/login');
          router.refresh();
        },
      },
    });
  };

  return (
    <Button onClick={handleLogout} variant="light">
      Se déconnecter
    </Button>
  );
}


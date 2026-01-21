import { Suspense, ReactNode } from 'react';
import { Container, Center, Loader } from '@mantine/core';

interface SuspenseLoaderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SuspenseLoader({ children, fallback }: SuspenseLoaderProps) {
  const defaultFallback = (
    <Container size="xl" py="xl">
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    </Container>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}


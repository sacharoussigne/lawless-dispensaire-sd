import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      '@mantine/core',
      '@mantine/hooks',
      '@mantine/dates',
      '@mantine/form',
      '@mantine/modals',
      '@mantine/notifications',
      '@mantine/nprogress',
      '@mantine/dropzone',
      '@mantine/charts',
      '@tabler/icons-react',
    ],
  },
};

export default nextConfig;

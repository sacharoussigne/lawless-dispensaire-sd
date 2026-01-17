import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import {
  ColorSchemeScript,
  mantineHtmlProps,
  MantineProvider,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';

import './globals.scss';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';

import theme from '@/lib/theme';
// Configuration dayjs avec fuseau horaire Europe/Paris
import '@/lib/dayjs';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Dispensaire Saint-Denis',
    default: 'Dispensaire Saint-Denis',
    absolute: 'Dispensaire Saint-Denis',
  },
  // viewport: 'width=device-width, initial-scale=1',
  // robots: "index, follow",
  // icons: {
  //   icon: "/favicon.ico",
  // },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <ColorSchemeScript />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MantineProvider theme={theme}>
          <ModalsProvider>
            <Notifications position={'top-right'} />
            {children}
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}

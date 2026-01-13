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
    template: '%s | Lingzy',
    default: 'Lingzy',
    absolute: 'Lingzy',
  },
  description:
    'Master languages with Lingzy - Your personal flashcard-based language learning companion. Practice, learn, and improve your language skills with interactive flashcards and personalized learning paths.',
  keywords:
    'language learning, education, language practice, interactive learning, language skills',
  authors: [{ name: 'Lingzy Team' }],
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

import type { Metadata } from 'next';
import { Cormorant_Garamond, Source_Sans_3 } from 'next/font/google';
import { Geist_Mono } from 'next/font/google';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';

import './globals.scss';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';
import './mantine-overrides.scss';

import '@/lib/dayjs';
import { MantineAppProvider } from './MantineAppProvider';

const fontDisplay = Cormorant_Garamond({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const fontUi = Source_Sans_3({
  variable: '--font-ui',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Dispensaire',
    default: 'Dispensaire',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" {...mantineHtmlProps}>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <ColorSchemeScript />
      </head>
      <body
        className={`${fontDisplay.variable} ${fontUi.variable} ${geistMono.variable} min-h-dvh flex flex-col`}
      >
        <MantineAppProvider>
          <div className="flex min-h-dvh flex-1 flex-col">{children}</div>
        </MantineAppProvider>
      </body>
    </html>
  );
}

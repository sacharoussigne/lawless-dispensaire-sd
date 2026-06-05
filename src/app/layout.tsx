import type { Metadata } from 'next';
import { Courier_Prime, Special_Elite } from 'next/font/google';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';

import './globals.scss';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import 'mantine-datatable/styles.css';
import './mantine-overrides.scss';

import '@/lib/dayjs';
import { MantineAppProvider } from './MantineAppProvider';

const fontUi = Courier_Prime({
  variable: '--font-ui',
  subsets: ['latin'],
  weight: ['400', '700'],
});

const fontDisplay = Special_Elite({
  variable: '--font-display',
  subsets: ['latin'],
  weight: '400',
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
    <html
      lang="fr"
      className={`${fontDisplay.variable} ${fontUi.variable} ${fontUi.className}`}
      {...mantineHtmlProps}
    >
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <ColorSchemeScript />
      </head>
      <body className="min-h-dvh flex flex-col">
        <MantineAppProvider>
          <div className="flex min-h-dvh flex-1 flex-col">{children}</div>
        </MantineAppProvider>
      </body>
    </html>
  );
}

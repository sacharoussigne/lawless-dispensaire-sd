'use client';

import classes from './TopBar.module.scss';
import { IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';

export default function TopBar({
  title,
  actions,
  goBackUrl,
  subActions,
}: {
  title: string;
  actions?: React.ReactNode;
  goBackUrl?: string;
  subActions?: React.ReactNode;
}) {

  return (
    <header className={`${classes.topBar} mb-5`}>
      <div className={'flex justify-between items-center w-full h-[60px]'}>
        <div>
          {goBackUrl && (
            <Link href={goBackUrl}>
              <IconArrowLeft size={24} />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{title}</h1>
          {subActions && <div className="flex gap-2">{subActions}</div>}
        </div>
        <div>{actions && <div className="flex gap-2">{actions}</div>}</div>
      </div>
    </header>
  );
}

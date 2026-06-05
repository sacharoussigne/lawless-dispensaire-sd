import type { ReactNode } from 'react';

export function LoggedInShell({ children }: { children: ReactNode }) {
  return <div className="disp-paper-bg flex flex-1 flex-col w-full">{children}</div>;
}

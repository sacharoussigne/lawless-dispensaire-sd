import type { ReactNode } from 'react';

export function LoggedInShell({ children }: { children: ReactNode }) {
  return <div className="disp-paper-bg min-h-screen flex flex-col">{children}</div>;
}

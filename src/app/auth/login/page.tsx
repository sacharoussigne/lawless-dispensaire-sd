import Login from '@/app/pages/login';
import { getAuthSession } from '@/lib/auth';
import { routes } from '@/types/routes';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Login',
};

export default async function LoginPage() {
  const session = await getAuthSession();

  if (session) {
    redirect(routes.stock.index);
  }
  return <Login />;
}

import { getAuthSession } from '@/lib/auth';
import Signup from '@/app/pages/signup';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { routes } from '@/types/routes';

export const metadata: Metadata = {
  title: 'Inscription',
};

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session) {
    redirect(routes.employee.index);
  }
  return <Signup />;
}

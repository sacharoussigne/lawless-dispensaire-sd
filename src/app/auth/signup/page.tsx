import { getAuthSession } from '@/lib/auth';
import Signup from '@/app/pages/signup';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { routes } from '@/types/routes';

export const metadata: Metadata = {
  title: 'Signup',
};

export default async function LoginPage() {
  const session = await getAuthSession();
  if (session) {
    redirect(routes.languages.index);
  }
  return <Signup />;
}

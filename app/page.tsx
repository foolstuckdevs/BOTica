import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function HomePage() {
  const session = await auth();

  // If user is authenticated, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  // If not authenticated, redirect to sign-in
  redirect('/sign-in');
}

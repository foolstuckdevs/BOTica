import AdjustmentForm from '@/components/AdjustmentForm';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function AdjustmentPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/sign-in');
  }

  if (!session.user.pharmacyId) {
    throw new Error('Unauthorized: user not assigned to any pharmacy.');
  }

  const pharmacyId = session.user.pharmacyId;

  return <AdjustmentForm userId={session.user.id} pharmacyId={pharmacyId} />;
}

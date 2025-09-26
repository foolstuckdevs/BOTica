import { auth } from '@/auth';
import { ActivityLogPageClient } from './ActivityLogPageClient';

export default async function Page() {
  const session = await auth();
  if (!session?.user?.pharmacyId) {
    throw new Error('Unauthorized: pharmacy not found on session');
  }

  // pharmacyId present in session; client component will call API using it server-side via route auth.

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Activity Log</h1>
      </div>
      <div className="bg-white rounded-lg shadow border p-2">
        <ActivityLogPageClient />
      </div>
    </div>
  );
}

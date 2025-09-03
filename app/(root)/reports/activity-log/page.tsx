import { DataTable } from '@/components/DataTable';
import { auth } from '@/auth';
import { getRecentActivity } from '@/lib/actions/activity';
import { columns, type ActivityRow } from './columns';

export default async function Page() {
  const session = await auth();
  if (!session?.user?.pharmacyId) {
    throw new Error('Unauthorized: pharmacy not found on session');
  }

  const pharmacyId = session.user.pharmacyId;
  // Fetch more entries for the full log page; e.g., 100
  const items = await getRecentActivity(pharmacyId, 100);

  // Normalize to ActivityRow shape
  const data: ActivityRow[] = items.map((it) => ({
    id: it.id,
    action: it.action ?? '',
    details: it.details ?? null,
    createdAt: (it.createdAt as unknown as string) ?? new Date().toISOString(),
    userFullName: it.userFullName ?? null,
  }));

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Activity Log</h1>
      </div>
      <div className="bg-white rounded-lg shadow border">
        <DataTable
          columns={columns}
          data={data}
          searchConfig={{
            enabled: true,
            placeholder: 'Search by user, action, order/invoice, or name...',
            globalFilter: true,
          }}
        />
      </div>
    </div>
  );
}

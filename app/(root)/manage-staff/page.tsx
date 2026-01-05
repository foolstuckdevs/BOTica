import { DataTable } from '@/components/DataTable';
import { auth } from '@/auth';
import { getStaffMembers } from '@/lib/actions/staff';
import { columns } from './columns';
import { UserForm } from '@/components/UserForm';

const Page = async () => {
  const session = await auth();

  if (!session?.user) {
    return null; // Middleware should have redirected unauthenticated users
  }

  const staffMembers = await getStaffMembers(
    session.user.id,
    session.user.pharmacyId,
  );

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <p className="text-gray-600">Manage your pharmacy assistants</p>
        </div>
        <UserForm />
      </div>

      <div className="bg-white rounded-lg shadow border">
        <DataTable
          columns={columns}
          data={staffMembers}
          searchConfig={{
            enabled: true,
            placeholder: 'Search by name, email...',
            globalFilter: true,
            searchableColumns: ['fullName', 'email'],
          }}
        />
      </div>
    </div>
  );
};

export default Page;

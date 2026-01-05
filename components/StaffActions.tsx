'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteDialog } from '@/components/DeleteDialog';
import { updateStaffStatus } from '@/lib/actions/staff';
import { StaffMember } from '@/types';

export function StaffActions({ user }: { user: StaffMember }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const newStatus = !user.isActive;
  const actionText = newStatus ? 'activate' : 'deactivate';

  const handleToggleStatus = async () => {
    setIsLoading(true);
    const result = await updateStaffStatus(user.id, newStatus);
    setIsLoading(false);

    if (!result.success) {
      toast.error(`Failed to ${actionText} staff account`);
      return;
    }

    toast.success(
      `Staff account ${newStatus ? 'activated' : 'deactivated'} successfully`,
    );
    setDialogOpen(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className={`${
            user.isActive
              ? 'text-orange-600 hover:text-orange-700'
              : 'text-green-600 hover:text-green-700'
          }`}
          title={user.isActive ? 'Deactivate assistant' : 'Activate assistant'}
        >
          {user.isActive ? (
            <UserX className="h-4 w-4" />
          ) : (
            <UserCheck className="h-4 w-4" />
          )}
        </Button>
      </div>

      <DeleteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleToggleStatus}
        title={`${newStatus ? 'Activate' : 'Deactivate'} Staff Account`}
        description={`Are you sure you want to ${actionText} ${
          user.fullName
        }'s account? ${
          newStatus
            ? 'They will be able to sign in again.'
            : 'They will no longer be able to sign in.'
        }`}
        confirmText={newStatus ? 'Activate Account' : 'Deactivate Account'}
        confirmVariant={newStatus ? 'default' : 'destructive'}
        icon={newStatus ? 'activate' : 'deactivate'}
        isLoading={isLoading}
        loadingText={`${newStatus ? 'Activating' : 'Deactivating'}...`}
      />
    </>
  );
}

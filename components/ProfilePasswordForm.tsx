'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePasswordForm({
  action,
}: {
  action: (
    formData: FormData,
  ) => Promise<{ ok: boolean; message: string }> | Promise<void> | void;
}) {
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  type ActionResult = { ok: boolean; message: string } | undefined | void;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = (await action(formData)) as ActionResult;
      if (res && typeof res === 'object' && 'ok' in res && res.ok) {
        toast.success(
          (res as { message?: string }).message || 'Password updated',
        );
        e.currentTarget.reset();
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
      } else if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
        toast.error((res as { message?: string }).message || 'Update failed');
      } else {
        toast.success('Password updated');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 w-full">
      <div className="grid gap-1">
        <label className="text-sm font-medium">Current password</label>
        <div className="relative">
          <Input
            type={showCurrent ? 'text' : 'password'}
            name="currentPassword"
            required
            placeholder="••••••••"
            className="w-full pr-10"
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            aria-label={showCurrent ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
          >
            {showCurrent ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium">New password</label>
        <div className="relative">
          <Input
            type={showNew ? 'text' : 'password'}
            name="newPassword"
            required
            placeholder="••••••••"
            className="w-full pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            aria-label={showNew ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
          >
            {showNew ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium">Confirm new password</label>
        <div className="relative">
          <Input
            type={showConfirm ? 'text' : 'password'}
            name="confirmPassword"
            required
            placeholder="••••••••"
            className="w-full pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
          >
            {showConfirm ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="default"
          className="bg-black hover:bg-black/90 text-white"
          disabled={pending}
        >
          {pending ? 'Updating…' : 'Update'}
        </Button>
      </div>
    </form>
  );
}

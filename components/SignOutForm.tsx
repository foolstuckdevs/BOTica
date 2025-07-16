'use client';

import { signOutAction } from '@/lib/auth/sign-out';
import { LogOut } from 'lucide-react';

export function SignOutForm() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="w-full text-left text-sm px-2 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded flex items-center"
      >
        <LogOut className="mr-2 h-4 w-4" />
        <span>Logout</span>
      </button>
    </form>
  );
}

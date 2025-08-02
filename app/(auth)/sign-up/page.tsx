'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const Page = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to sign-in since public registration is disabled
    router.replace('/sign-in');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Registration Disabled</h1>
        <p className="text-gray-600 mb-4">
          User registration is managed by system administrators only.
        </p>
        <p className="text-sm text-gray-500">
          Contact your system administrator for account access.
        </p>
      </div>
    </div>
  );
};

export default Page;

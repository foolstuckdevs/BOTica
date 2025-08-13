'use client';

import AuthForm from '@/components/AuthForm';
import { signInWithCredentials } from '@/lib/actions/auth';
import { signInSchema } from '@/lib/validations';
import React from 'react';

const Page = () => {
  return (
    <>
      <AuthForm
        type="SIGN_IN"
        schema={signInSchema}
        defaultValues={{ email: '', password: '' }}
        onSubmit={async (data, rememberMe) => {
          const result = await signInWithCredentials(data, rememberMe || false);
          return result;
        }}
      />
    </>
  );
};

export default Page;

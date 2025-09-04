import { auth } from '@/auth';
import { updateProfile, updatePassword } from '@/lib/actions/profile';
import ProfilePageClient from './ProfilePageClient';
import { signUpSchema } from '@/lib/validations';

export default async function ProfilePage() {
  const session = await auth();
  const name = session?.user?.name || '';
  const email = session?.user?.email || '';

  async function saveProfile(formData: FormData) {
    'use server';
    const data = {
      fullName: String(formData.get('fullName') || ''),
      email: String(formData.get('email') || ''),
    };
    const parsed = signUpSchema
      .pick({ fullName: true, email: true })
      .safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message || 'Invalid data',
      };
    }
    return await updateProfile(formData);
  }

  async function changePassword(formData: FormData) {
    'use server';
    return await updatePassword(formData);
  }

  const initials = (name || email || 'U')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ProfilePageClient
      name={name}
      email={email}
      initials={initials}
      saveProfile={saveProfile}
      changePassword={changePassword}
    />
  );
}

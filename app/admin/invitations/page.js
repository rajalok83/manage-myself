import { redirect } from 'next/navigation';
import InvitationManagement from '@/components/InvitationManagement';
import { INVITE_ADMIN_EMAIL } from '@/lib/config';
import { getSessionUser, normalizeEmail } from '@/lib/turso';

export const dynamic = 'force-dynamic';

export default async function InvitationsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');
  if (normalizeEmail(user.email) !== normalizeEmail(INVITE_ADMIN_EMAIL)) redirect('/dashboard');

  return <InvitationManagement />;
}

import { getSessionUser } from '../../lib/turso';
import { redirect } from 'next/navigation';
import DashboardClient from '../../components/DashboardClient';
import { AUTH_CONFIG } from '@/lib/config';
import { categories } from '@/lib/categories';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');

  return (
    <DashboardClient 
      user={{ ...user }}
      isInviteAdmin={String(user.email || '').trim().toLowerCase() === String(AUTH_CONFIG.INVITE_ADMIN_EMAIL || '').trim().toLowerCase()}
      categories={categories}
    />
  );
}

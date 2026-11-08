import { getSessionUser } from '../../lib/turso';
import { redirect } from 'next/navigation';
import DashboardClient from '../../components/DashboardClient';
import { INVITE_ADMIN_EMAIL } from '@/lib/config';
import { categories } from '@/lib/categories';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');

  return (
    <DashboardClient 
      user={{ ...user }}
      isInviteAdmin={String(user.email || '').trim().toLowerCase() === INVITE_ADMIN_EMAIL}
      categories={categories}
    />
  );
}

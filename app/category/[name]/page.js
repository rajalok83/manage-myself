import { getSessionUser } from '@/lib/turso';
import { redirect } from 'next/navigation';
import CategoryClient from '@/components/CategoryClient';
import { AUTH_CONFIG } from '@/lib/config';
import { getCategoryConfiguration } from '@/lib/category-config';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }) {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const categoryName = decodeURIComponent(params.name);
  const categories = await getCategoryConfiguration();

  return (
    <CategoryClient
      key={categoryName}
      user={{ ...user }}
      isInviteAdmin={String(user.email || '').trim().toLowerCase() === String(AUTH_CONFIG.INVITE_ADMIN_EMAIL || '').trim().toLowerCase()}
      categoryName={categoryName}
      categories={categories}
    />
  );
}

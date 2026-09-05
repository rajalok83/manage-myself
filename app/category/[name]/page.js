import { getSessionUser } from '@/lib/turso';
import { redirect } from 'next/navigation';
import CategoryClient from '@/components/CategoryClient';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }) {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const categoryName = decodeURIComponent(params.name);

  return <CategoryClient user={{ ...user }} categoryName={categoryName} />;
}

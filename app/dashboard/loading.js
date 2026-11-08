import PageLoading from '@/components/PageLoading';
import { categories } from '@/lib/categories';

export default function Loading() {
  return <PageLoading message="Loading your dashboard…" categories={Object.keys(categories)} />;
}

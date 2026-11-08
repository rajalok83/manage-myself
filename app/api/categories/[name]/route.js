import { getSessionUser } from '@/lib/turso';
import { getCategoryData } from '@/lib/user-data';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await getCategoryData(user.id, decodeURIComponent(params.name));
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Category API load error:', error);
    return NextResponse.json({ error: 'Unable to load category data.' }, { status: 500 });
  }
}
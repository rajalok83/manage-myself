import { getSessionUser, turso } from '@/lib/turso';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CredentialRow from '@/components/CredentialRow';
import CategoryAddForm from '@/components/CategoryAddForm';
import NavigationBar from '@/components/NavigationBar';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }) {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const categoryName = decodeURIComponent(params.name);

  const dataQuery = await turso.execute({
    sql: `SELECT id, category, nickname, web_url, login_id, description 
          FROM credentials 
          WHERE owner_id = ? AND category = ?
          ORDER BY nickname ASC`,
    args: [user.id, categoryName]
  });

  const shareCountQuery = await turso.execute({
    sql: 'SELECT COUNT(*) as count FROM credential_shares s JOIN credentials c ON s.credential_id = c.id WHERE c.owner_id = ?',
    args: [user.id]
  });
  const sharedByMeCount = Number(shareCountQuery.rows[0]?.count || 0);

  return (
    <>
      <NavigationBar user={user} sharedByMeCount={sharedByMeCount} />
      <main style={{ padding: '76px 5px 5px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <section>
        {/* <h2 style={{ marginBottom: '20px' }}>Stored Items ({dataQuery.rows.length})</h2> */}
        {dataQuery.rows.length === 0 ? (
          <p style={{ color: '#718096', fontStyle: 'italic' }}>No records saved in {categoryName} section yet.</p>
        ) : (
          dataQuery.rows.map((row) => (
            <CredentialRow key={row.id} item={row} isSharedView={false} />
          ))
        )}
      </section>
      </main>
    </>
  );
}

import { getSessionUser, turso } from '@/lib/turso';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CredentialRow from '@/components/CredentialRow';
import CategoryAddForm from '@/components/CategoryAddForm';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }) {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const categoryName = decodeURIComponent(params.name);

  const dataQuery = await turso.execute({
    sql: `SELECT id, nickname, web_url, login_id, description 
          FROM credentials 
          WHERE owner_id = ? AND category = ?
          ORDER BY nickname ASC`,
    args: [user.id, categoryName]
  });

  return (
    <main style={{ padding: '5px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '5px' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', color: '#3182ce', fontWeight: 'bold' }}>
        <h1 style={{ marginTop: '5px', marginBottom: '0px' }}>← {categoryName}</h1>
        </Link>
        {/* <p style={{ color: '#666', margin: 0 }}>Manage or reveal encrypted records safely saved under this section.</p> */}
      </div>

      {/* <CategoryAddForm category={categoryName} /> */}

      <section>
        {/* <h2 style={{ marginBottom: '20px' }}>Stored Items ({dataQuery.rows.length})</h2> */}
        {dataQuery.rows.length === 0 ? (
          <p style={{ color: '#718096', fontStyle: 'italic' }}>No records saved in this section yet.</p>
        ) : (
          dataQuery.rows.map((row) => (
            <CredentialRow key={row.id} item={row} isSharedView={false} />
          ))
        )}
      </section>
    </main>
  );
}

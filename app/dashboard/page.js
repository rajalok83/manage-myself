import { getSessionUser, turso } from '../../lib/turso';
import { redirect } from 'next/navigation';
import DashboardClient from '../../components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const categories = {
    "Websites": ['Banking', 'Social Media', 'Work Tools', 'Shopping', 'Entertainment', 'Misc'],
    "Cards": ["Debit", "Credit"],
    "Identity": ["Aadhar", "PAN", "VOTER ID"],
    "Money Matters": ["Bank Account", "Demat Accounts", "Insurance", "Mutual Funds", "Stocks"]

  }
  // const categories = ;

  let sharedByMeRows = [];
  let sharedWithMeRows = [];
  let allCredentials = [];

  try {
    const credentialsQuery = await turso.execute({
      sql: `SELECT id, category, nickname, web_url, login_id, description, created_at 
            FROM credentials 
            WHERE owner_id = ? 
            ORDER BY created_at DESC`,
      args: [user.id]
    });

    const sharedByMeQuery = await turso.execute({
      sql: `SELECT c.id, c.nickname, c.category, u.email as shared_with
            FROM credential_shares s
            JOIN credentials c ON s.credential_id = c.id
            JOIN users u ON s.shared_with_user_id = u.id
            WHERE c.owner_id = ?`,
      args: [user.id]
    });

    const sharedWithMeQuery = await turso.execute({
      sql: `SELECT c.id, c.category, c.nickname, c.web_url, c.login_id, c.description, u.email as shared_by
            FROM credentials c
            JOIN credential_shares s ON c.id = s.credential_id
            JOIN users u ON c.owner_id = u.id
            WHERE s.shared_with_user_id = ?`,
      args: [user.id]
    });

    allCredentials = credentialsQuery.rows || [];
    sharedByMeRows = sharedByMeQuery.rows || [];
    sharedWithMeRows = sharedWithMeQuery.rows || [];
  } catch (error) {
    console.error('Dashboard data load error:', error);
  }

  return (
    <DashboardClient 
      user={user}
      categories={categories}
      allCredentials={allCredentials}
      sharedByMeRows={sharedByMeRows}
      sharedWithMeRows={sharedWithMeRows}
    />
  );
}

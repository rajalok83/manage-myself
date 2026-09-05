import { getSessionUser } from '../../lib/turso';
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

  return (
    <DashboardClient 
      user={{ ...user }}
      categories={categories}
    />
  );
}

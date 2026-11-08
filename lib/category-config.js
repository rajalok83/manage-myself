import { turso } from '@/lib/turso';

const defaultCategories = [
  ['Websites', ['Banking', 'Social Media', 'Work Tools', 'Shopping', 'Entertainment', 'Misc']],
  ['Cards', ['Debit', 'Credit']],
  ['Identity', ['Aadhar', 'PAN', 'VOTER ID']],
  ['Money Matters', ['Bank Account', 'Demat Accounts', 'Insurance', 'Mutual Funds', 'Stocks']],
  ['Notes', []],
  ['Insurance', ['Medical Wealth', 'Health', 'Term', 'Auto']],
  ['Cash', ['Lent', 'Borrowed']]
];

let categoryConfigurationReady;

async function ensureCategoryConfiguration() {
  if (!categoryConfigurationReady) {
    categoryConfigurationReady = (async () => {
      await turso.execute(`CREATE TABLE IF NOT EXISTS vault_categories (
        name TEXT PRIMARY KEY,
        sort_order INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
      )`);
      await turso.execute(`CREATE TABLE IF NOT EXISTS vault_subcategories (
        category_name TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        PRIMARY KEY (category_name, name),
        FOREIGN KEY (category_name) REFERENCES vault_categories(name) ON DELETE CASCADE
      )`);

      for (const [categoryIndex, [category, subcategories]] of defaultCategories.entries()) {
        await turso.execute({
          sql: 'INSERT OR IGNORE INTO vault_categories (name, sort_order) VALUES (?, ?)',
          args: [category, categoryIndex]
        });
        for (const [subcategoryIndex, subcategory] of subcategories.entries()) {
          await turso.execute({
            sql: `INSERT OR IGNORE INTO vault_subcategories
              (category_name, name, sort_order) VALUES (?, ?, ?)`,
            args: [category, subcategory, subcategoryIndex]
          });
        }
      }
    })().catch((error) => {
      categoryConfigurationReady = undefined;
      throw error;
    });
  }
  await categoryConfigurationReady;
}

export async function getCategoryConfiguration() {
  await ensureCategoryConfiguration();
  const result = await turso.execute(`
    SELECT c.name AS category, s.name AS subcategory
    FROM vault_categories c
    LEFT JOIN vault_subcategories s
      ON s.category_name = c.name AND s.is_active = 1
    WHERE c.is_active = 1
    ORDER BY c.sort_order, s.sort_order, s.name
  `);

  const categories = {};
  for (const row of result.rows) {
    categories[row.category] ||= [];
    if (row.subcategory) categories[row.category].push(row.subcategory);
  }
  return categories;
}

export async function isValidCategorySelection(category, subcategory) {
  const normalizedCategory = String(category || '').trim();
  const normalizedSubcategory = String(subcategory || '').trim();
  if (!normalizedCategory) return false;
  await ensureCategoryConfiguration();
  const result = await turso.execute({
    sql: `SELECT 1 FROM vault_categories c
      WHERE c.name = ? AND c.is_active = 1 AND (
        (? <> '' AND EXISTS (
          SELECT 1 FROM vault_subcategories s
          WHERE s.category_name = c.name AND s.name = ? AND s.is_active = 1
        ))
        OR (? = '' AND NOT EXISTS (
          SELECT 1 FROM vault_subcategories s
          WHERE s.category_name = c.name AND s.is_active = 1
        ))
      )
      LIMIT 1`,
    args: [normalizedCategory, normalizedSubcategory, normalizedSubcategory, normalizedSubcategory]
  });
  return result.rows.length > 0;
}

import { turso } from '@/lib/turso';

export async function getCategoryConfiguration() {
  const result = await turso.execute(`
    SELECT c.name AS category, s.name AS subcategory
    FROM vault_categories c
    LEFT JOIN vault_subcategories s
      ON s.category_name = c.name AND s.is_active = 1
    WHERE c.is_active = 1
    ORDER BY c.name COLLATE NOCASE, s.name COLLATE NOCASE
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

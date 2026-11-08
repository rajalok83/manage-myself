import {
  ensureCredentialMetadataColumns,
  ensureCredentialShareColumns,
  ensureNotesTables,
  turso
} from '@/lib/turso';

let pageDataSchemaReady;

async function ensureSubcategoryColumn() {
  try {
    await turso.execute('ALTER TABLE credentials ADD COLUMN subcategory TEXT');
  } catch (error) {
    if (!error.message?.includes('duplicate column name')) throw error;
  }
}

async function ensurePageDataSchema() {
  if (!pageDataSchemaReady) {
    pageDataSchemaReady = Promise.all([
      ensureCredentialMetadataColumns(),
      ensureCredentialShareColumns(),
      ensureNotesTables(),
      ensureSubcategoryColumn()
    ]).catch((error) => {
      pageDataSchemaReady = undefined;
      throw error;
    });
  }
  await pageDataSchemaReady;
}

export async function getDashboardData(userId) {
  await ensurePageDataSchema();

  const [
    credentialsQuery,
    notesQuery,
    sharedByMeQuery,
    sharedWithMeQuery,
    noteSharedByMeQuery,
    noteSharedWithMeQuery
  ] = await Promise.all([
    turso.execute({
      sql: `SELECT c.id, c.category, c.nickname, c.created_at, c.subcategory,
        CASE WHEN c.category = 'Cash' AND c.plain_details IS NOT NULL THEN 0 ELSE 1 END AS requires_pin
        FROM credentials c WHERE c.owner_id = ? ORDER BY c.category COLLATE NOCASE, c.nickname COLLATE NOCASE`,
      args: [userId]
    }),
    turso.execute({
      sql: `SELECT id, 'Notes' AS category, NULL AS subcategory, nickname, created_at,
        'note' AS item_type, 0 AS requires_pin
        FROM notes WHERE owner_id = ? ORDER BY nickname COLLATE NOCASE`,
      args: [userId]
    }),
    turso.execute({
      sql: `SELECT c.id, c.nickname, c.category, 'credential' AS item_type,
        CASE WHEN c.category = 'Cash' AND c.plain_details IS NOT NULL THEN 0 ELSE 1 END AS requires_pin,
        c.subcategory, u.email AS shared_with, s.share_mode
        FROM credential_shares s JOIN credentials c ON s.credential_id = c.id
        JOIN users u ON s.shared_with_user_id = u.id WHERE c.owner_id = ?
        ORDER BY c.category COLLATE NOCASE, c.nickname COLLATE NOCASE, u.email COLLATE NOCASE`,
      args: [userId]
    }),
    turso.execute({
      sql: `SELECT c.id, c.category, c.nickname, 'credential' AS item_type,
        CASE WHEN c.category = 'Cash' AND c.plain_details IS NOT NULL THEN 0 ELSE 1 END AS requires_pin,
        c.subcategory, u.email AS shared_by, s.share_mode
        FROM credentials c JOIN credential_shares s ON c.id = s.credential_id
        JOIN users u ON c.owner_id = u.id WHERE s.shared_with_user_id = ?
        ORDER BY c.category COLLATE NOCASE, c.nickname COLLATE NOCASE, c.id`,
      args: [userId]
    }),
    turso.execute({
      sql: `SELECT n.id, n.nickname, 'Notes' AS category, 'note' AS item_type,
        u.email AS shared_with, s.share_mode
        FROM note_shares s JOIN notes n ON s.note_id = n.id
        JOIN users u ON s.shared_with_user_id = u.id WHERE n.owner_id = ?
        ORDER BY n.nickname COLLATE NOCASE, u.email COLLATE NOCASE`,
      args: [userId]
    }),
    turso.execute({
      sql: `SELECT n.id, 'Notes' AS category, n.nickname, 'note' AS item_type,
        u.email AS shared_by, s.share_mode
        FROM notes n JOIN note_shares s ON n.id = s.note_id
        JOIN users u ON n.owner_id = u.id WHERE s.shared_with_user_id = ?
        ORDER BY n.nickname COLLATE NOCASE, n.id`,
      args: [userId]
    })
  ]);

  return {
    credentials: sortByCategoryAndTitle([
      ...credentialsQuery.rows.map((row) => ({ ...row, item_type: 'credential' })),
      ...notesQuery.rows
    ]),
    sharedByMe: sortByCategoryAndTitle(groupSharedByMe([...sharedByMeQuery.rows, ...noteSharedByMeQuery.rows])),
    sharedWithMe: sortByCategoryAndTitle([...sharedWithMeQuery.rows, ...noteSharedWithMeQuery.rows])
  };
}

export async function getCategoryData(userId, categoryName) {
  await ensurePageDataSchema();

  const [credentialsQuery, notesQuery, shareCountQuery] = await Promise.all([
    turso.execute({
      sql: `SELECT c.id, c.category, c.nickname, c.subcategory,
        CASE WHEN c.category = 'Cash' AND c.plain_details IS NOT NULL THEN 0 ELSE 1 END AS requires_pin
        FROM credentials c WHERE c.owner_id = ? AND c.category = ? ORDER BY c.nickname COLLATE NOCASE`,
      args: [userId, categoryName]
    }),
    turso.execute({
      sql: `SELECT id, 'Notes' AS category, nickname, NULL AS subcategory,
        'note' AS item_type FROM notes WHERE owner_id = ? ORDER BY nickname COLLATE NOCASE`,
      args: [userId]
    }),
    turso.execute({
      sql: `SELECT
        (SELECT COUNT(*) FROM credential_shares s JOIN credentials c ON s.credential_id = c.id WHERE c.owner_id = ?)
        + (SELECT COUNT(*) FROM note_shares s JOIN notes n ON s.note_id = n.id WHERE n.owner_id = ?) AS count`,
      args: [userId, userId]
    })
  ]);

  return {
    credentials: categoryName === 'Notes'
      ? notesQuery.rows
      : credentialsQuery.rows.map((row) => ({ ...row, item_type: 'credential' })),
    sharedByMeCount: Number(shareCountQuery.rows[0]?.count || 0)
  };
}

export async function getShareData(userId) {
  await ensurePageDataSchema();

  const [sharedWithMe, sharedByMe, sharedNotesWithMe, sharedNotesByMe] = await Promise.all([
    turso.execute({
      sql: `SELECT c.id, c.category, c.nickname, 'credential' AS item_type,
        CASE WHEN c.category = 'Cash' AND c.plain_details IS NOT NULL THEN 0 ELSE 1 END AS requires_pin,
        c.subcategory, u.email AS shared_by, s.share_mode
        FROM credentials c JOIN credential_shares s ON c.id = s.credential_id
        JOIN users u ON c.owner_id = u.id WHERE s.shared_with_user_id = ?
        ORDER BY c.category COLLATE NOCASE, c.nickname COLLATE NOCASE, c.id`,
      args: [userId]
    }),
    turso.execute({
      sql: `SELECT c.id, c.nickname, c.category, 'credential' AS item_type,
        CASE WHEN c.category = 'Cash' AND c.plain_details IS NOT NULL THEN 0 ELSE 1 END AS requires_pin,
        c.subcategory, u.email AS shared_with, s.share_mode
        FROM credential_shares s JOIN credentials c ON s.credential_id = c.id
        JOIN users u ON s.shared_with_user_id = u.id WHERE c.owner_id = ?
        ORDER BY c.category COLLATE NOCASE, c.nickname COLLATE NOCASE, u.email COLLATE NOCASE`,
      args: [userId]
    }),
    turso.execute({
      sql: `SELECT n.id, 'Notes' AS category, n.nickname, NULL AS subcategory, 0 AS requires_pin,
        'note' AS item_type, u.email AS shared_by, s.share_mode
        FROM notes n JOIN note_shares s ON n.id = s.note_id
      JOIN users u ON n.owner_id = u.id WHERE s.shared_with_user_id = ?
      ORDER BY n.nickname COLLATE NOCASE, n.id`,
      args: [userId]
    }),
    turso.execute({
      sql: `SELECT n.id, 'Notes' AS category, n.nickname, NULL AS subcategory, 0 AS requires_pin,
        'note' AS item_type, u.email AS shared_with, s.share_mode
        FROM note_shares s JOIN notes n ON s.note_id = n.id
      JOIN users u ON s.shared_with_user_id = u.id WHERE n.owner_id = ?
      ORDER BY n.nickname COLLATE NOCASE, u.email COLLATE NOCASE`,
      args: [userId]
    })
  ]);

  return {
    sharedWithMe: sortByCategoryAndTitle([...sharedWithMe.rows, ...sharedNotesWithMe.rows]),
    sharedByMe: sortByCategoryAndTitle(groupSharedByMe([...sharedByMe.rows, ...sharedNotesByMe.rows]))
  };
}

function sortByCategoryAndTitle(rows) {
  return rows.sort((a, b) => {
    const categoryOrder = String(a.category || '').localeCompare(String(b.category || ''), undefined, { sensitivity: 'base' });
    if (categoryOrder !== 0) return categoryOrder;
    return String(a.nickname || '').localeCompare(String(b.nickname || ''), undefined, { sensitivity: 'base' });
  });
}

function groupSharedByMe(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.item_type}:${row.id}`;
    const existing = grouped.get(key);
    const recipient = { email: row.shared_with, share_mode: row.share_mode };
    if (existing) {
      existing.shared_with.push(recipient);
    } else {
      grouped.set(key, {
        id: row.id,
        nickname: row.nickname,
        category: row.category,
        subcategory: row.subcategory,
        item_type: row.item_type,
        shared_with: [recipient]
      });
    }
  }
  return Array.from(grouped.values());
}

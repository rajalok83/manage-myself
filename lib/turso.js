import { createClient } from '@libsql/client';
import { cookies } from 'next/headers';
import { AUTH_CONFIG, INVITE_ADMIN_EMAIL } from '@/lib/config';

export const turso = createClient({
  url: AUTH_CONFIG.TURSO_DATABASE_URL || 'file:local.db',
  authToken: AUTH_CONFIG.TURSO_AUTH_TOKEN,
});

let invitationsTableReady;

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function ensureInvitationsTable() {
  if (!invitationsTableReady) {
    invitationsTableReady = turso.execute(`CREATE TABLE IF NOT EXISTS invited_emails (
      email TEXT PRIMARY KEY,
      invited_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      revoked_at TEXT
    )`).catch((error) => {
      invitationsTableReady = undefined;
      throw error;
    });
  }
  await invitationsTableReady;
}

export async function isEmailAllowed(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  if (normalizedEmail === normalizeEmail(INVITE_ADMIN_EMAIL)) return true;

  await ensureInvitationsTable();
  const result = await turso.execute({
    sql: 'SELECT 1 FROM invited_emails WHERE email = ? AND revoked_at IS NULL LIMIT 1',
    args: [normalizedEmail]
  });
  return result.rows.length > 0;
}

export async function ensureCredentialMetadataColumns() {
  for (const column of ['encrypted_metadata TEXT', 'metadata_salt TEXT', 'metadata_iv TEXT', 'encrypted_details TEXT', 'plain_details TEXT']) {
    try {
      await turso.execute(`ALTER TABLE credentials ADD COLUMN ${column}`);
    } catch (error) {
      if (!error.message?.includes('duplicate column name')) throw error;
    }
  }
}

export async function ensureNotesTables() {
  await ensureCredentialShareColumns();
  await turso.execute(`CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    markdown TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(owner_id, nickname)
  )`);
  await turso.execute(`CREATE TABLE IF NOT EXISTS note_shares (
    note_id INTEGER NOT NULL,
    shared_with_user_id TEXT NOT NULL,
    shared_at TEXT DEFAULT (datetime('now')),
    share_mode TEXT NOT NULL DEFAULT 'view',
    PRIMARY KEY (note_id, shared_with_user_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  await turso.execute('CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_id)');
  await turso.execute('CREATE INDEX IF NOT EXISTS idx_note_shares_recipient ON note_shares(shared_with_user_id)');

  const credentialColumns = await turso.execute('PRAGMA table_info(credentials)');
  if (!credentialColumns.rows.some((column) => column.name === 'markdown')) return;

  await turso.execute(`INSERT OR IGNORE INTO notes (id, owner_id, nickname, markdown, created_at)
    SELECT id, owner_id, nickname, markdown, created_at FROM credentials WHERE category = 'Notes'`);
  await turso.execute(`INSERT OR IGNORE INTO note_shares (note_id, shared_with_user_id, shared_at, share_mode)
    SELECT c.id, s.shared_with_user_id, s.shared_at, s.share_mode
    FROM credentials c JOIN credential_shares s ON s.credential_id = c.id
    WHERE c.category = 'Notes'`);
  await turso.execute(`DELETE FROM credential_shares WHERE credential_id IN
    (SELECT id FROM credentials WHERE category = 'Notes')`);
  await turso.execute("DELETE FROM credentials WHERE category = 'Notes'");
}

export async function ensureCashTransactionsTable() {
  await turso.execute(`CREATE TABLE IF NOT EXISTS cash_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    credential_id INTEGER NOT NULL,
    encrypted_details TEXT,
    salt TEXT,
    iv TEXT,
    amount REAL,
    transaction_date TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE
  )`);
  for (const column of ['amount REAL', 'transaction_date TEXT', 'note TEXT']) {
    try {
      await turso.execute(`ALTER TABLE cash_transactions ADD COLUMN ${column}`);
    } catch (error) {
      if (!error.message?.includes('duplicate column name')) throw error;
    }
  }
}

export async function ensureCredentialShareColumns() {
  try {
    await turso.execute("ALTER TABLE credential_shares ADD COLUMN share_mode TEXT NOT NULL DEFAULT 'view'");
  } catch (error) {
    if (!error.message?.includes('duplicate column name')) throw error;
  }
}

export async function getSessionUser() {
  // 1. Safely retrieve the cookie container
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  // ❌ CRITICAL: If there is no cookie, stop immediately and return null
  if (!token) {
    return null;
  }

  try {
    await ensureInvitationsTable();

    // 2. Query your local.db for the active session row
    const result = await turso.execute({
      sql: `SELECT users.* FROM sessions 
            JOIN users ON sessions.user_id = users.id 
            WHERE sessions.id = ? AND sessions.expires_at > ? 
              AND (
                lower(trim(users.email)) = ?
                OR EXISTS (
                  SELECT 1 FROM invited_emails
                  WHERE invited_emails.email = lower(trim(users.email))
                    AND invited_emails.revoked_at IS NULL
                )
              )
            LIMIT 1`,
      args: [token, Math.floor(Date.now() / 1000), normalizeEmail(INVITE_ADMIN_EMAIL)]
    });

    // ❌ CRITICAL: Check if rows actually exist. 
    // An empty array '[]' is truthy and will break 'if (user)' loops!
    if (result.rows && result.rows.length > 0) {
      return result.rows[0]; // Return the single user object record
    }

    // No valid session row matched in the database
    return null;

  } catch (error) {
    console.error("Database session lookup error:", error);
    return null;
  }
}
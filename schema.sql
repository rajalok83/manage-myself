-- DDL definition initialization script for Turso Data Spaces

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invited_emails (
    email TEXT PRIMARY KEY,
    invited_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT NOT NULL,
    category TEXT NOT NULL, 
    subcategory TEXT,
    nickname TEXT NOT NULL,
    encrypted_metadata TEXT,
    metadata_salt TEXT,
    metadata_iv TEXT,
    encrypted_password TEXT NOT NULL, 
    salt TEXT NOT NULL, 
    iv TEXT NOT NULL, 
    encrypted_details TEXT,
    plain_details TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(owner_id, nickname) -- Enforce unique nicknames across a user's profile
);

CREATE TABLE IF NOT EXISTS credential_shares (
    credential_id INTEGER NOT NULL,
    shared_with_user_id TEXT NOT NULL,
    shared_at TEXT DEFAULT (datetime('now')),
    share_mode TEXT NOT NULL DEFAULT 'view',
    PRIMARY KEY (credential_id, shared_with_user_id),
    FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credentials_owner ON credentials(owner_id);
CREATE INDEX IF NOT EXISTS idx_shares_recipient ON credential_shares(shared_with_user_id);

CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    markdown TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(owner_id, nickname)
);

CREATE TABLE IF NOT EXISTS note_shares (
    note_id INTEGER NOT NULL,
    shared_with_user_id TEXT NOT NULL,
    shared_at TEXT DEFAULT (datetime('now')),
    share_mode TEXT NOT NULL DEFAULT 'view',
    PRIMARY KEY (note_id, shared_with_user_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_note_shares_recipient ON note_shares(shared_with_user_id);

CREATE TABLE IF NOT EXISTS cash_transactions (
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
);

CREATE TABLE IF NOT EXISTS vault_categories (
    name TEXT PRIMARY KEY,
    sort_order INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS vault_subcategories (
    category_name TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    PRIMARY KEY (category_name, name),
    FOREIGN KEY (category_name) REFERENCES vault_categories(name) ON DELETE CASCADE
);

INSERT OR IGNORE INTO vault_categories (name, sort_order) VALUES
    ('Websites', 0),
    ('Cards', 1),
    ('Identity', 2),
    ('Money Matters', 3),
    ('Notes', 4),
    ('Insurance', 5),
    ('Cash', 6);

INSERT OR IGNORE INTO vault_subcategories (category_name, name, sort_order) VALUES
    ('Websites', 'Banking', 0),
    ('Websites', 'Social Media', 1),
    ('Websites', 'Work Tools', 2),
    ('Websites', 'Shopping', 3),
    ('Websites', 'Entertainment', 4),
    ('Websites', 'Misc', 5),
    ('Cards', 'Debit', 0),
    ('Cards', 'Credit', 1),
    ('Identity', 'Aadhar', 0),
    ('Identity', 'PAN', 1),
    ('Identity', 'VOTER ID', 2),
    ('Money Matters', 'Bank Account', 0),
    ('Money Matters', 'Demat Accounts', 1),
    ('Money Matters', 'Insurance', 2),
    ('Money Matters', 'Mutual Funds', 3),
    ('Money Matters', 'Stocks', 4),
    ('Insurance', 'Medical Wealth', 0),
    ('Insurance', 'Health', 1),
    ('Insurance', 'Term', 2),
    ('Insurance', 'Auto', 3),
    ('Cash', 'Lent', 0),
    ('Cash', 'Borrowed', 1);

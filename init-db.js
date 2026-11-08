import { createClient } from '@libsql/client';
import { readFile } from 'node:fs/promises';

const db = createClient({
  url: 'file:local.db',
});

async function init() {
  console.log("Creating local database file and creating tables...");
  try {
    const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
    const statements = schema.split(';').map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) {
      await db.execute(statement);
    }
    console.log("✅ Local data tracking tables initialized in local.db!");
  } catch (error) {
    console.error("❌ Schema build error:", error);
    process.exitCode = 1;
  }
}

init();

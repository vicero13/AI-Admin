import * as fs from 'fs';
import * as path from 'path';
import { PgConnection } from './connection';

export async function runMigrations(connection: PgConnection): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await connection.query(sql);
    console.log('[migrate] Schema applied successfully');
  } catch (err) {
    console.error('[migrate] Failed to apply schema:', err);
    throw err;
  }
}

// Allow running as standalone script
if (require.main === module) {
  const config = {
    host: process.env.PG_HOST ?? 'localhost',
    port: parseInt(process.env.PG_PORT ?? '5432', 10),
    database: process.env.PG_DATABASE ?? 'ai_admin',
    user: process.env.PG_USER ?? 'postgres',
    password: process.env.PG_PASSWORD ?? '',
  };

  const connection = new PgConnection(config);

  runMigrations(connection)
    .then(() => {
      console.log('[migrate] Done');
      return connection.close();
    })
    .catch((err) => {
      console.error('[migrate] Migration failed:', err);
      process.exit(1);
    });
}

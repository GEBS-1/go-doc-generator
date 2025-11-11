const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL не задан. Укажите строку подключения к PostgreSQL в переменных окружения.');
}

const shouldUseSsl =
  process.env.PGSSLMODE === 'require' ||
  process.env.PGSSL === 'true' ||
  /render\.com|supabase|railway|neon\.tech|aws/.test(connectionString);

const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
});

const transformPlaceholders = (sql = '') => {
  let index = 0;
  const text = sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
  return { text, index };
};

let initPromise;

const runQuery = async (sql, params = []) => {
  await initPromise;

  const { text, index } = transformPlaceholders(sql);

  if (index !== params.length) {
    throw new Error(
      `Количество плейсхолдеров и аргументов не совпадает для SQL: ${sql} (placeholders: ${index}, params: ${params.length})`,
    );
  }

  return pool.query(text, params);
};

const initDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      photo_url TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'inactive',
      docs_generated INTEGER NOT NULL DEFAULT 0,
      docs_limit INTEGER,
      reset_date TIMESTAMPTZ,
      activated_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      payment_id TEXT UNIQUE NOT NULL,
      amount NUMERIC(10, 2),
      currency TEXT DEFAULT 'RUB',
      plan TEXT,
      status TEXT DEFAULT 'pending',
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

initPromise = initDatabase().catch((error) => {
  console.error('[DB] Не удалось инициализировать базу данных:', error);
  process.exit(1);
});

const run = async (sql, params = []) => {
  const result = await runQuery(sql, params);
  return {
    lastID: result.rows?.[0]?.id ?? null,
    changes: result.rowCount ?? 0,
    rows: result.rows,
  };
};

const get = async (sql, params = []) => {
  const result = await runQuery(sql, params);
  return result.rows?.[0] || null;
};

const all = async (sql, params = []) => {
  const result = await runQuery(sql, params);
  return result.rows;
};

const shutdown = async () => {
  await initPromise;
  await pool.end();
};

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

module.exports = {
  pool,
  run,
  get,
  all,
};

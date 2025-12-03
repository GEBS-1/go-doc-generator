const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

let pool = null;

if (connectionString) {
  const shouldUseSsl =
    process.env.PGSSLMODE === 'require' ||
    process.env.PGSSL === 'true' ||
    /render\.com|supabase|railway|neon\.tech|aws/.test(connectionString);

  pool = new Pool({
    connectionString,
    ssl: shouldUseSsl
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  });
} else {
  console.warn('[DB] DATABASE_URL не задан. БД будет недоступна, но сервер продолжит работу.');
}

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
  if (!pool) {
    throw new Error('База данных недоступна. Проверьте подключение к БД.');
  }
  
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
  if (!pool) {
    throw new Error('DATABASE_URL не задан');
  }
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

  // Таблица для временных токенов авторизации (как на poehali.dev)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id SERIAL PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      telegram_id BIGINT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Индекс для быстрого поиска по токену
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token)
  `);

  // Индекс для очистки истекших токенов
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at)
  `);

};

initPromise = initDatabase().catch((error) => {
  console.error('[DB] Не удалось инициализировать базу данных:', error.message);
  console.warn('[DB] Сервер продолжит работу, но функции БД будут недоступны');
  // Не убиваем процесс, чтобы сервер мог работать для GigaChat API даже без БД
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

import { neon } from "@neondatabase/serverless";
import { DEFAULT_SOURCES } from "./defaultSources";

let schemaPromise: Promise<void> | null = null;

export function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL (ou POSTGRES_URL) não configurada. Conecte o Neon / Vercel Postgres nas variáveis de ambiente."
    );
  }
  return neon(url);
}

/**
 * Cria/atualiza as tabelas automaticamente e garante isolamento por usuário.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    const sql = getSql();

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS resumes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        target_role TEXT NOT NULL DEFAULT '',
        seniority TEXT NOT NULL DEFAULT '',
        skills JSONB NOT NULL DEFAULT '[]'::jsonb,
        summary TEXT NOT NULL DEFAULT '',
        experience TEXT NOT NULL DEFAULT '',
        education TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS sources (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        target TEXT NOT NULL,
        selector TEXT,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        last_checked_at TIMESTAMPTZ,
        last_status TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE sources ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`;

    await sql`
      CREATE TABLE IF NOT EXISTS keywords (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        term TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE keywords ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE keywords DROP CONSTRAINT IF EXISTS keywords_term_key`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS keywords_user_term_idx ON keywords (COALESCE(user_id, 0), term)`;

    await sql`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        external_id TEXT NOT NULL,
        source_id INTEGER REFERENCES sources(id) ON DELETE CASCADE,
        source_name TEXT NOT NULL,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        url TEXT NOT NULL,
        published_at TEXT,
        notified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_external_id_key`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS jobs_user_external_idx ON jobs (COALESCE(user_id, 0), external_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS scrape_runs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ,
        jobs_found INTEGER NOT NULL DEFAULT 0,
        new_jobs INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        error TEXT
      )
    `;
    await sql`ALTER TABLE scrape_runs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`;

    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, key)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  })().catch((err) => {
    schemaPromise = null;
    throw err;
  });

  return schemaPromise;
}

export async function seedDefaultSourcesForUser(userId: number): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  const existing = await sql`SELECT COUNT(*)::int AS count FROM sources WHERE user_id = ${userId}`;
  if (existing[0]?.count === 0) {
    for (const src of DEFAULT_SOURCES) {
      await sql`
        INSERT INTO sources (user_id, name, type, target, enabled)
        VALUES (${userId}, ${src.name}, ${src.type}, ${src.target}, TRUE)
      `;
    }
  }
}

export async function syncMissingDefaultSourcesForUser(
  userId: number
): Promise<number> {
  await ensureSchema();
  const sql = getSql();
  const current = (await sql`
    SELECT type, target FROM sources WHERE user_id = ${userId}
  `) as Array<{ type: string; target: string }>;

  const existingKeys = new Set(current.map((s) => `${s.type}:${s.target}`));
  let added = 0;

  for (const src of DEFAULT_SOURCES) {
    const key = `${src.type}:${src.target}`;
    if (!existingKeys.has(key)) {
      await sql`
        INSERT INTO sources (user_id, name, type, target, enabled)
        VALUES (${userId}, ${src.name}, ${src.type}, ${src.target}, TRUE)
      `;
      existingKeys.add(key);
      added++;
    }
  }

  return added;
}

export async function getAlertSettings(userId?: number): Promise<{
  alertEmail: string;
  telegramChatId: string;
}> {
  await ensureSchema();
  const sql = getSql();

  if (!userId) {
    return {
      alertEmail: process.env.ALERT_EMAIL_TO || "",
      telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
    };
  }

  const rows = (await sql`
    SELECT key, value FROM user_settings
    WHERE user_id = ${userId} AND key IN ('alert_email', 'telegram_chat_id')
  `) as Array<{ key: string; value: string }>;

  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    alertEmail: map.get("alert_email") || "",
    telegramChatId: map.get("telegram_chat_id") || "",
  };
}

export async function getLocationFilter(userId: number): Promise<{
  state: string;
  cities: string[];
  includeRemote: boolean;
}> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT key, value FROM user_settings
    WHERE user_id = ${userId}
      AND key IN ('filter_state', 'filter_cities', 'include_remote')
  `) as Array<{ key: string; value: string }>;

  const map = new Map(rows.map((r) => [r.key, r.value]));
  let cities: string[] = [];
  try {
    const parsed = JSON.parse(map.get("filter_cities") || "[]");
    if (Array.isArray(parsed)) {
      cities = parsed.map((c) => String(c).trim()).filter(Boolean).slice(0, 5);
    }
  } catch {
    cities = [];
  }

  return {
    state: map.get("filter_state") || "",
    cities,
    includeRemote: map.get("include_remote") !== "false",
  };
}

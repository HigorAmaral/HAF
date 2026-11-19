import { neon } from "@neondatabase/serverless";

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
 * Cria as tabelas automaticamente na primeira execução e insere fontes iniciais.
 */
export async function ensureSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    const sql = getSql();

    await sql`
      CREATE TABLE IF NOT EXISTS sources (
        id SERIAL PRIMARY KEY,
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

    await sql`
      CREATE TABLE IF NOT EXISTS keywords (
        id SERIAL PRIMARY KEY,
        term TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        external_id TEXT NOT NULL UNIQUE,
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

    await sql`
      CREATE TABLE IF NOT EXISTS scrape_runs (
        id SERIAL PRIMARY KEY,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ,
        jobs_found INTEGER NOT NULL DEFAULT 0,
        new_jobs INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        error TEXT
      )
    `;

    // Seed inicial de fontes públicas caso a tabela esteja vazia
    const existing = await sql`SELECT COUNT(*)::int AS count FROM sources`;
    if (existing[0]?.count === 0) {
      await sql`
        INSERT INTO sources (name, type, target, enabled)
        VALUES
          ('Remotive (Vagas Remotas)', 'remotive', 'all', TRUE),
          ('Arbeitnow (Tech & Remoto)', 'arbeitnow', 'all', TRUE),
          ('RemoteOK (Global Remoto)', 'remoteok', 'all', TRUE),
          ('Jobicy (Remoto Internacional)', 'jobicy', 'all', TRUE),
          ('Himalayas (Tech Remoto)', 'himalayas', 'all', TRUE),
          ('WeWorkRemotely (RSS)', 'rss', 'https://weworkremotely.com/remote-jobs.rss', TRUE),
          ('FrontendBR (GitHub Vagas)', 'github_issues', 'frontendbr/vagas', TRUE),
          ('BackendBR (GitHub Vagas)', 'github_issues', 'backend-br/vagas', TRUE),
          ('React Brasil (GitHub Vagas)', 'github_issues', 'react-brasil/vagas', TRUE)
      `;
    }
  })().catch((err) => {
    schemaPromise = null;
    throw err;
  });

  return schemaPromise;
}

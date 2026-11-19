import { NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";

export async function GET() {
  try {
    await ensureSchema();
    const sql = getSql();

    const [jobs, sources, keywords, runs] = await Promise.all([
      sql`SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT * FROM sources ORDER BY id ASC`,
      sql`SELECT * FROM keywords ORDER BY id ASC`,
      sql`SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 10`,
    ]);

    return NextResponse.json({
      jobs,
      sources,
      keywords,
      runs,
      integrations: {
        database: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
        telegram: Boolean(
          process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
        ),
        email: Boolean(process.env.RESEND_API_KEY && process.env.ALERT_EMAIL_TO),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao carregar painel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

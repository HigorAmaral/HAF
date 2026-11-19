import { NextResponse } from "next/server";
import { ensureSchema, getAlertSettings, getSql } from "@/lib/db";

export async function GET() {
  try {
    await ensureSchema();
    const sql = getSql();

    const [jobs, sources, keywords, runs, settings] = await Promise.all([
      sql`SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100`,
      sql`SELECT * FROM sources ORDER BY id ASC`,
      sql`SELECT * FROM keywords ORDER BY id ASC`,
      sql`SELECT * FROM scrape_runs ORDER BY started_at DESC LIMIT 10`,
      getAlertSettings(),
    ]);

    return NextResponse.json({
      jobs,
      sources,
      keywords,
      runs,
      settings,
      integrations: {
        database: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
        telegram: Boolean(
          process.env.TELEGRAM_BOT_TOKEN && settings.telegramChatId
        ),
        email: Boolean(process.env.RESEND_API_KEY && settings.alertEmail),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao carregar painel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

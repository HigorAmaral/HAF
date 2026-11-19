import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  ensureSchema,
  getAlertSettings,
  getLocationFilter,
  getSql,
  seedDefaultSourcesForUser,
} from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    await ensureSchema();
    await seedDefaultSourcesForUser(user.userId);
    const sql = getSql();

    const [jobs, sources, keywords, runs, settings, locationFilter, resumeRows] =
      await Promise.all([
        sql`SELECT * FROM jobs WHERE user_id = ${user.userId} ORDER BY created_at DESC LIMIT 120`,
        sql`SELECT * FROM sources WHERE user_id = ${user.userId} ORDER BY id ASC`,
        sql`SELECT * FROM keywords WHERE user_id = ${user.userId} ORDER BY id ASC`,
        sql`SELECT * FROM scrape_runs WHERE user_id = ${user.userId} ORDER BY started_at DESC LIMIT 10`,
        getAlertSettings(user.userId),
        getLocationFilter(user.userId),
        sql`SELECT * FROM resumes WHERE user_id = ${user.userId} LIMIT 1`,
      ]);

    return NextResponse.json({
      user: { id: user.userId, name: user.name, email: user.email },
      jobs,
      sources,
      keywords,
      runs,
      settings,
      locationFilter,
      resume: resumeRows[0] || null,
      integrations: {
        database: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
        telegram: Boolean(
          process.env.TELEGRAM_BOT_TOKEN && settings.telegramChatId
        ),
        email: Boolean(process.env.RESEND_API_KEY && settings.alertEmail),
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao carregar painel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

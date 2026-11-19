import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const body = (await req.json()) as {
      alertEmail?: string;
      telegramChatId?: string;
    };

    const alertEmail = (body.alertEmail || "").trim();
    const telegramChatId = (body.telegramChatId || "").trim();

    await sql`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('alert_email', ${alertEmail}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;

    await sql`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('telegram_chat_id', ${telegramChatId}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;

    return NextResponse.json({ ok: true, alertEmail, telegramChatId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao salvar configurações";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

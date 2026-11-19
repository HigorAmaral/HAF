import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureSchema, getSql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

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
      INSERT INTO user_settings (user_id, key, value, updated_at)
      VALUES (${user.userId}, 'alert_email', ${alertEmail}, NOW())
      ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;

    await sql`
      INSERT INTO user_settings (user_id, key, value, updated_at)
      VALUES (${user.userId}, 'telegram_chat_id', ${telegramChatId}, NOW())
      ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;

    return NextResponse.json({ ok: true, alertEmail, telegramChatId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao salvar configurações";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

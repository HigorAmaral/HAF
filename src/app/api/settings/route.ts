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
      filterState?: string;
      filterCities?: string[];
      includeRemote?: boolean;
      workMode?: string;
    };

    if (body.alertEmail !== undefined) {
      const alertEmail = body.alertEmail.trim();
      await sql`
        INSERT INTO user_settings (user_id, key, value, updated_at)
        VALUES (${user.userId}, 'alert_email', ${alertEmail}, NOW())
        ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    if (body.telegramChatId !== undefined) {
      const telegramChatId = body.telegramChatId.trim();
      await sql`
        INSERT INTO user_settings (user_id, key, value, updated_at)
        VALUES (${user.userId}, 'telegram_chat_id', ${telegramChatId}, NOW())
        ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    if (body.filterState !== undefined) {
      const state = body.filterState.trim().toUpperCase();
      await sql`
        INSERT INTO user_settings (user_id, key, value, updated_at)
        VALUES (${user.userId}, 'filter_state', ${state}, NOW())
        ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    if (body.filterCities !== undefined) {
      const cities = Array.isArray(body.filterCities)
        ? body.filterCities.map((c) => String(c).trim()).filter(Boolean).slice(0, 5)
        : [];
      await sql`
        INSERT INTO user_settings (user_id, key, value, updated_at)
        VALUES (${user.userId}, 'filter_cities', ${JSON.stringify(cities)}, NOW())
        ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    if (body.includeRemote !== undefined) {
      await sql`
        INSERT INTO user_settings (user_id, key, value, updated_at)
        VALUES (${user.userId}, 'include_remote', ${String(Boolean(body.includeRemote))}, NOW())
        ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    if (body.workMode !== undefined) {
      const mode = ["all", "remote", "hybrid", "onsite"].includes(body.workMode)
        ? body.workMode
        : "all";
      await sql`
        INSERT INTO user_settings (user_id, key, value, updated_at)
        VALUES (${user.userId}, 'work_mode', ${mode}, NOW())
        ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao salvar configurações";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

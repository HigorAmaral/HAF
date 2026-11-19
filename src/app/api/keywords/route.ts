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
    const body = (await req.json()) as { term?: string };
    const term = body.term?.trim();

    if (!term) {
      return NextResponse.json(
        { error: "Informe uma palavra-chave." },
        { status: 400 }
      );
    }

    const rows = await sql`
      INSERT INTO keywords (user_id, term)
      VALUES (${user.userId}, ${term})
      ON CONFLICT (COALESCE(user_id, 0), term) DO NOTHING
      RETURNING *
    `;

    return NextResponse.json(rows[0] ?? { term }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao adicionar filtro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

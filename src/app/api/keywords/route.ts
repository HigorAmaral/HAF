import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";

export async function POST(req: NextRequest) {
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
      INSERT INTO keywords (term)
      VALUES (${term})
      ON CONFLICT (term) DO NOTHING
      RETURNING *
    `;

    return NextResponse.json(rows[0] ?? { term }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao adicionar filtro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

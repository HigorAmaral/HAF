import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureSchema, getSql } from "@/lib/db";

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    await sql`
      DELETE FROM jobs
      WHERE user_id = ${user.userId}
        AND saved = FALSE
        AND applied = FALSE
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao limpar vagas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const sql = getSql();
    const { id } = await context.params;
    const body = (await req.json()) as { enabled?: boolean };

    const rows = await sql`
      UPDATE sources
      SET enabled = ${Boolean(body.enabled)}
      WHERE id = ${Number(id)}
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Fonte não encontrada" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar fonte";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const sql = getSql();
    const { id } = await context.params;

    await sql`DELETE FROM sources WHERE id = ${Number(id)}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao remover fonte";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

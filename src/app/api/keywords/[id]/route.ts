import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const sql = getSql();
    const { id } = await context.params;

    await sql`DELETE FROM keywords WHERE id = ${Number(id)}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao remover filtro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

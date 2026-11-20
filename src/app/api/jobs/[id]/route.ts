import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureSchema, getSql } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const { id } = await context.params;
    const body = (await req.json()) as {
      saved?: boolean;
      applied?: boolean;
      application_stage?: string;
      notes?: string;
    };

    const rows = await sql`
      UPDATE jobs
      SET
        saved = COALESCE(${body.saved ?? null}, saved),
        applied = COALESCE(${body.applied ?? null}, applied),
        application_stage = COALESCE(${body.application_stage ?? null}, application_stage),
        notes = COALESCE(${body.notes ?? null}, notes)
      WHERE id = ${Number(id)} AND user_id = ${user.userId}
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Vaga não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao atualizar vaga";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const { id } = await context.params;

    await sql`DELETE FROM jobs WHERE id = ${Number(id)} AND user_id = ${user.userId}`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao remover vaga";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

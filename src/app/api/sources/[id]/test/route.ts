import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureSchema, getSql } from "@/lib/db";
import { runSourceConnector } from "@/lib/scrapers/connectors";
import type { SourceRecord } from "@/lib/scrapers/types";

export const maxDuration = 30;

export async function POST(
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
    const rows = (await sql`
      SELECT * FROM sources WHERE id = ${Number(id)} AND user_id = ${user.userId} LIMIT 1
    `) as SourceRecord[];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Fonte não encontrada" },
        { status: 404 }
      );
    }

    const source = rows[0];
    try {
      const scraped = await runSourceConnector(source);
      const statusText = `OK (${scraped.length} vagas)`;
      await sql`
        UPDATE sources
        SET last_checked_at = NOW(), last_status = ${statusText}
        WHERE id = ${source.id}
      `;
      return NextResponse.json({
        ok: true,
        sourceName: source.name,
        count: scraped.length,
        sample: scraped.slice(0, 3).map((j) => ({
          title: j.title,
          company: j.company,
          location: j.location,
        })),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      const statusText = `Erro: ${msg.slice(0, 120)}`;
      await sql`
        UPDATE sources
        SET last_checked_at = NOW(), last_status = ${statusText}
        WHERE id = ${source.id}
      `;
      return NextResponse.json({
        ok: false,
        sourceName: source.name,
        error: msg,
      });
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao testar fonte";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

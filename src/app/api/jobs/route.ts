import crypto from "crypto";
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
      title?: string;
      company?: string;
      location?: string;
      url?: string;
      salary?: string;
      description?: string;
      application_stage?: string;
      follow_up_at?: string;
      notes?: string;
    };

    const title = body.title?.trim();
    const company = body.company?.trim();

    if (!title || !company) {
      return NextResponse.json(
        { error: "Informe o título da vaga e a empresa." },
        { status: 400 }
      );
    }

    const stage = body.application_stage?.trim() || "enviado";
    const applied = stage !== "salva" && stage !== "";
    const externalId = `manual:${Date.now()}:${crypto.randomBytes(4).toString("hex")}`;
    const url = body.url?.trim() || "https://haf-two.vercel.app";

    const rows = await sql`
      INSERT INTO jobs (
        user_id, external_id, source_id, source_name, title, company, location,
        url, published_at, notified, saved, applied, application_stage, notes,
        description, salary, follow_up_at
      )
      VALUES (
        ${user.userId},
        ${externalId},
        ${null},
        ${"Cadastro Manual"},
        ${title},
        ${company},
        ${body.location?.trim() || "Brasil"},
        ${url},
        ${new Date().toISOString()},
        ${true},
        ${true},
        ${applied},
        ${stage},
        ${body.notes?.trim() || ""},
        ${body.description?.trim() || ""},
        ${body.salary?.trim() || ""},
        ${body.follow_up_at?.trim() || ""}
      )
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao cadastrar vaga manual";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

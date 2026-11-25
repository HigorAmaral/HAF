import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureSchema, getSql } from "@/lib/db";
import type { SourceType } from "@/lib/scrapers/types";

const ALLOWED_TYPES: SourceType[] = [
  "remotive",
  "arbeitnow",
  "remoteok",
  "jobicy",
  "himalayas",
  "themuse",
  "workingnomads",
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "recruitee",
  "breezy",
  "bamboohr",
  "pinpoint",
  "personio",
  "gupy",
  "github_issues",
  "rss",
  "html",
];

const NO_TARGET_TYPES: SourceType[] = [
  "remotive",
  "arbeitnow",
  "remoteok",
  "jobicy",
  "himalayas",
  "themuse",
  "workingnomads",
];

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const body = (await req.json()) as {
      name?: string;
      type?: SourceType;
      target?: string;
      selector?: string;
    };

    const name = body.name?.trim();
    const type = body.type;
    const target = body.target?.trim() || "all";
    const selector = body.selector?.trim() || null;

    if (!name || !type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Informe um nome e um tipo de fonte válido." },
        { status: 400 }
      );
    }

    if (
      !NO_TARGET_TYPES.includes(type) &&
      (!body.target || !body.target.trim())
    ) {
      return NextResponse.json(
        { error: "Informe a URL ou identificador da empresa/fonte." },
        { status: 400 }
      );
    }

    const rows = await sql`
      INSERT INTO sources (user_id, name, type, target, selector, enabled)
      VALUES (${user.userId}, ${name}, ${type}, ${target}, ${selector}, TRUE)
      RETURNING *
    `;

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar fonte";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

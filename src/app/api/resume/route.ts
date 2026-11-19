import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ensureSchema, getSql } from "@/lib/db";
import { runJobMonitorForUser } from "@/lib/scrapers/runner";

export const maxDuration = 60;

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await ensureSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM resumes WHERE user_id = ${user.userId}`;
  return NextResponse.json({ resume: rows[0] || null });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const body = (await req.json()) as {
      fullName?: string;
      email?: string;
      phone?: string;
      targetRole?: string;
      seniority?: string;
      skills?: string[];
      summary?: string;
      experience?: string;
      education?: string;
      photoUrl?: string;
      location?: string;
      linkedinUrl?: string;
      portfolioUrl?: string;
      languages?: string;
      certifications?: string;
      workModel?: string;
      autoSearch?: boolean;
    };

    const fullName = (body.fullName || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();
    const targetRole = (body.targetRole || "").trim();
    const seniority = (body.seniority || "").trim();
    const skills = Array.isArray(body.skills)
      ? body.skills.map((s) => String(s).trim()).filter(Boolean)
      : [];
    const summary = (body.summary || "").trim();
    const experience = (body.experience || "").trim();
    const education = (body.education || "").trim();
    const photoUrl = (body.photoUrl || "").trim();
    const location = (body.location || "").trim();
    const linkedinUrl = (body.linkedinUrl || "").trim();
    const portfolioUrl = (body.portfolioUrl || "").trim();
    const languages = (body.languages || "").trim();
    const certifications = (body.certifications || "").trim();
    const workModel = (body.workModel || "").trim();

    const rows = await sql`
      INSERT INTO resumes (
        user_id, full_name, email, phone, target_role, seniority, skills,
        summary, experience, education, photo_url, location, linkedin_url,
        portfolio_url, languages, certifications, work_model, updated_at
      )
      VALUES (
        ${user.userId}, ${fullName}, ${email}, ${phone}, ${targetRole}, ${seniority},
        ${JSON.stringify(skills)}::jsonb, ${summary}, ${experience}, ${education},
        ${photoUrl}, ${location}, ${linkedinUrl}, ${portfolioUrl},
        ${languages}, ${certifications}, ${workModel}, NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        target_role = EXCLUDED.target_role,
        seniority = EXCLUDED.seniority,
        skills = EXCLUDED.skills,
        summary = EXCLUDED.summary,
        experience = EXCLUDED.experience,
        education = EXCLUDED.education,
        photo_url = EXCLUDED.photo_url,
        location = EXCLUDED.location,
        linkedin_url = EXCLUDED.linkedin_url,
        portfolio_url = EXCLUDED.portfolio_url,
        languages = EXCLUDED.languages,
        certifications = EXCLUDED.certifications,
        work_model = EXCLUDED.work_model,
        updated_at = NOW()
      RETURNING *
    `;

    // Sincroniza palavras-chave automaticamente com base no currículo
    const autoTerms = new Set<string>();
    for (const s of skills.slice(0, 10)) {
      if (s.length >= 2) autoTerms.add(s);
    }
    if (targetRole) {
      // Adiciona palavras relevantes do cargo (ex: "Full Stack", "Frontend", "Dados")
      const roleTokens = targetRole
        .split(/[\s,/|-]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 3 && !/^(de|da|do|em|para|com|and|the)$/i.test(t));
      for (const token of roleTokens.slice(0, 4)) {
        autoTerms.add(token);
      }
    }

    for (const term of autoTerms) {
      await sql`
        INSERT INTO keywords (user_id, term)
        VALUES (${user.userId}, ${term})
        ON CONFLICT (COALESCE(user_id, 0), term) DO NOTHING
      `;
    }

    // Se o usuário informou e-mail no currículo e ainda não tinha e-mail de alerta, preenche
    if (email) {
      await sql`
        INSERT INTO user_settings (user_id, key, value)
        VALUES (${user.userId}, 'alert_email', ${email})
        ON CONFLICT (user_id, key) DO NOTHING
      `;
    }

    let scrapeResult = null;
    if (body.autoSearch) {
      scrapeResult = await runJobMonitorForUser(user.userId);
    }

    return NextResponse.json({
      resume: rows[0],
      syncedKeywords: Array.from(autoTerms),
      scrapeResult,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao salvar currículo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

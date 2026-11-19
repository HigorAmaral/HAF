import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieOptions,
  hashPassword,
} from "@/lib/auth";
import { ensureSchema, getSql, seedDefaultSourcesForUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password || "";

    if (!name || !email || password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Informe nome, e-mail válido e uma senha com pelo menos 6 caracteres.",
        },
        { status: 400 }
      );
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Já existe uma conta cadastrada com este e-mail." },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const inserted = (await sql`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name}, ${email}, ${passwordHash})
      RETURNING id, name, email
    `) as Array<{ id: number; name: string; email: string }>;

    const user = inserted[0];

    // Cria as 9 fontes padrão e define o e-mail de alertas inicial
    await seedDefaultSourcesForUser(user.id);
    await sql`
      INSERT INTO user_settings (user_id, key, value)
      VALUES (${user.id}, 'alert_email', ${user.email})
      ON CONFLICT (user_id, key) DO NOTHING
    `;

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
    res.cookies.set({ ...getSessionCookieOptions(), value: token });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar conta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { ensureSchema, getSql, seedDefaultSourcesForUser } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const body = (await req.json()) as { email?: string; password?: string };

    const email = body.email?.trim().toLowerCase();
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Informe e-mail e senha." },
        { status: 400 }
      );
    }

    const rows = (await sql`
      SELECT id, name, email, password_hash FROM users WHERE email = ${email}
    `) as Array<{
      id: number;
      name: string;
      email: string;
      password_hash: string;
    }>;

    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos." },
        { status: 401 }
      );
    }

    await seedDefaultSourcesForUser(user.id);

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
    const message = err instanceof Error ? err.message : "Erro ao entrar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

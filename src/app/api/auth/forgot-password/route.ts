import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const body = (await req.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Informe seu e-mail." },
        { status: 400 }
      );
    }

    const users = (await sql`
      SELECT id, name, email FROM users WHERE email = ${email}
    `) as Array<{ id: number; name: string; email: string }>;

    if (users.length > 0) {
      const user = users[0];
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      // Invalida tokens anteriores não usados deste usuário
      await sql`
        UPDATE password_reset_tokens SET used = TRUE
        WHERE user_id = ${user.id} AND used = FALSE
      `;

      await sql`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (${user.id}, ${tokenHash}, NOW() + INTERVAL '1 hour')
      `;

      const origin =
        req.headers.get("origin") ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "https://haf-higoramarals-projects.vercel.app");

      const resetUrl = `${origin}/?reset_token=${rawToken}`;
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
    }

    // Resposta genérica para evitar enumeração de e-mails
    return NextResponse.json({
      ok: true,
      message:
        "Se o e-mail estiver cadastrado, enviamos um link de recuperação válido por 1 hora.",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao solicitar recuperação";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

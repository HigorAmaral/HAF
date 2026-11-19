import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { ensureSchema, getSql } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const sql = getSql();
    const body = (await req.json()) as {
      token?: string;
      newPassword?: string;
    };

    const rawToken = body.token?.trim();
    const newPassword = body.newPassword || "";

    if (!rawToken || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Token inválido ou senha com menos de 6 caracteres." },
        { status: 400 }
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const rows = (await sql`
      SELECT id, user_id
      FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
        AND used = FALSE
        AND expires_at > NOW()
      LIMIT 1
    `) as Array<{ id: number; user_id: number }>;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Link de recuperação inválido ou expirado." },
        { status: 400 }
      );
    }

    const resetRow = rows[0];
    const passwordHash = hashPassword(newPassword);

    await sql`
      UPDATE users SET password_hash = ${passwordHash}
      WHERE id = ${resetRow.user_id}
    `;

    await sql`
      UPDATE password_reset_tokens SET used = TRUE
      WHERE id = ${resetRow.id}
    `;

    return NextResponse.json({
      ok: true,
      message: "Senha alterada com sucesso! Agora você já pode entrar.",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao redefinir senha";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

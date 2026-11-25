import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieOptions,
  getSessionUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { ensureSchema, getSql } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    await ensureSchema();
    const sql = getSql();
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "O nome precisa ter pelo menos 2 caracteres." },
        { status: 400 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Informe um e-mail válido." },
        { status: 400 }
      );
    }

    const existingEmailRows = await sql`
      SELECT id FROM users WHERE email = ${email} AND id <> ${session.userId} LIMIT 1
    `;
    if (existingEmailRows.length > 0) {
      return NextResponse.json(
        { error: "Este e-mail já está em uso por outra conta." },
        { status: 409 }
      );
    }

    let updatedPasswordHash: string | null = null;
    if (body.newPassword && body.newPassword.length > 0) {
      if (body.newPassword.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve ter pelo menos 6 caracteres." },
          { status: 400 }
        );
      }
      if (!body.currentPassword) {
        return NextResponse.json(
          { error: "Informe sua senha atual para alterar a senha." },
          { status: 400 }
        );
      }

      const userRows = (await sql`
        SELECT password_hash FROM users WHERE id = ${session.userId} LIMIT 1
      `) as Array<{ password_hash: string }>;

      if (
        userRows.length === 0 ||
        !verifyPassword(body.currentPassword, userRows[0].password_hash)
      ) {
        return NextResponse.json(
          { error: "Senha atual incorreta." },
          { status: 401 }
        );
      }

      updatedPasswordHash = hashPassword(body.newPassword);
    }

    const rows = updatedPasswordHash
      ? await sql`
          UPDATE users
          SET name = ${name}, email = ${email}, password_hash = ${updatedPasswordHash}
          WHERE id = ${session.userId}
          RETURNING id, name, email
        `
      : await sql`
          UPDATE users
          SET name = ${name}, email = ${email}
          WHERE id = ${session.userId}
          RETURNING id, name, email
        `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const updatedUser = {
      id: Number(rows[0].id),
      name: String(rows[0].name),
      email: String(rows[0].email),
    };

    const token = createSessionToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
    });

    const response = NextResponse.json({ user: updatedUser });
    response.cookies.set(getSessionCookieOptions().name, token, getSessionCookieOptions());
    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao atualizar conta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

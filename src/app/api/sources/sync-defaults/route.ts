import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { syncMissingDefaultSourcesForUser } from "@/lib/db";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const added = await syncMissingDefaultSourcesForUser(user.userId);
    return NextResponse.json({ ok: true, added });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao sincronizar fontes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

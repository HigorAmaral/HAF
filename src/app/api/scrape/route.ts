import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runJobMonitorForUser } from "@/lib/scrapers/runner";

export const maxDuration = 60;

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const result = await runJobMonitorForUser(user.userId);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao executar monitor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

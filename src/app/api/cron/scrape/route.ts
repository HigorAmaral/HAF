import { NextRequest, NextResponse } from "next/server";
import { runJobMonitor } from "@/lib/scrapers/runner";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  try {
    const result = await runJobMonitor();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro no cron";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

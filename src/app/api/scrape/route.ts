import { NextResponse } from "next/server";
import { runJobMonitor } from "@/lib/scrapers/runner";

export const maxDuration = 60;

export async function POST() {
  try {
    const result = await runJobMonitor();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao executar monitor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

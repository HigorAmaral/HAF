import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAlertSettings } from "@/lib/db";
import { notifyNewJobs } from "@/lib/notifications";
import type { JobRecord } from "@/lib/scrapers/types";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const sampleJob: JobRecord = {
    id: 0,
    external_id: "test:0",
    source_id: null,
    source_name: "Teste do Sistema",
    title: "Desenvolvedor(a) Full Stack (Teste de Alerta)",
    company: "HAF Monitor",
    location: "Remoto",
    url: "https://haf-higoramarals-projects.vercel.app",
    published_at: new Date().toISOString(),
    notified: false,
    created_at: new Date().toISOString(),
  };

  const settings = await getAlertSettings(user.userId);
  const result = await notifyNewJobs([sampleJob], settings);
  return NextResponse.json(result);
}

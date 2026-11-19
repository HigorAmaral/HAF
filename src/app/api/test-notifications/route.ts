import { NextResponse } from "next/server";
import { getAlertSettings } from "@/lib/db";
import { notifyNewJobs } from "@/lib/notifications";
import type { JobRecord } from "@/lib/scrapers/types";

export async function POST() {
  const sampleJob: JobRecord = {
    id: 0,
    external_id: "test:0",
    source_id: null,
    source_name: "Teste do Sistema",
    title: "Desenvolvedor(a) Full Stack (Teste de Alerta)",
    company: "HAF Monitor",
    location: "Remoto",
    url: "https://vercel.com",
    published_at: new Date().toISOString(),
    notified: false,
    created_at: new Date().toISOString(),
  };

  const settings = await getAlertSettings();
  const result = await notifyNewJobs([sampleJob], settings);
  return NextResponse.json(result);
}

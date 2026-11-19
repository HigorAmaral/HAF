import { NextResponse } from "next/server";
import { notifyNewJobs } from "@/lib/notifications";
import type { JobRecord } from "@/lib/scrapers/types";

export async function POST() {
  const sampleJob: JobRecord = {
    id: 0,
    external_id: "test:0",
    source_id: null,
    source_name: "Teste do Sistema",
    title: "Desenvolvedor(a) Full Stack (Teste de Alerta)",
    company: "Monitor de Vagas",
    location: "Remoto",
    url: "https://vercel.com",
    published_at: new Date().toISOString(),
    notified: false,
    created_at: new Date().toISOString(),
  };

  const result = await notifyNewJobs([sampleJob]);
  return NextResponse.json(result);
}

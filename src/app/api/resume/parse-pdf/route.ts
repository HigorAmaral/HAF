import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { parseResumePdf } from "@/lib/resumeParser";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Envie um arquivo PDF válido." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "O arquivo precisa estar no formato .pdf" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "O PDF deve ter no máximo 5 MB." },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const parsed = await parseResumePdf(buffer);

    return NextResponse.json({ parsed });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao ler o PDF do currículo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

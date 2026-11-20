import { jsPDF } from "jspdf";
import type { ResumeData } from "@/components/ResumeBuilder";

/**
 * Normaliza caracteres Unicode para WinAnsi (suportado nativamente pela fonte Helvetica do jsPDF),
 * evitando símbolos corrompidos (%Ï, %Ë) e espaçamento quebrado em linhas com emojis.
 */
function sanitizeForPdf(text: string): string {
  if (!text) return "";

  return text
    .replace(/\r\n/g, "\n")
    // Substitui marcadores/emojis comuns por hífen limpo
    .replace(/[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25CF\u25CB\u25B8\u25BA\u2713\u2714]/g, "-")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    // Aspas e travessões para equivalentes seguros
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00A0/g, " ")
    // Remove quaisquer caracteres fora da faixa Latin-1 (U+0000 - U+00FF)
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "")
    // Limpa espaços duplicados por linha preservando quebras de linha
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
    .join("\n")
    .trim();
}

export function downloadProfessionalResumePdf(resume: ResumeData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Cabeçalho executivo escuro
  const headerHeight = 44;
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  let textStartX = margin;
  if (resume.photoUrl && resume.photoUrl.startsWith("data:image/")) {
    try {
      const imgSize = 28;
      const imgY = (headerHeight - imgSize) / 2;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin - 0.5, imgY - 0.5, imgSize + 1, imgSize + 1, 3, 3, "F");
      const format = resume.photoUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(resume.photoUrl, format, margin, imgY, imgSize, imgSize);
      textStartX = margin + imgSize + 8;
    } catch {
      textStartX = margin;
    }
  }

  const headerTextWidth = pageWidth - textStartX - margin;

  // Nome e Cargo
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  const safeNameText = sanitizeForPdf(resume.fullName || "Seu Nome Completo");
  doc.text(safeNameText, textStartX, 16, { maxWidth: headerTextWidth });

  const roleLine = sanitizeForPdf(
    [resume.targetRole, resume.seniority, resume.workModel]
      .filter(Boolean)
      .join("  |  ")
  );
  if (roleLine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(148, 163, 184);
    doc.text(roleLine, textStartX, 23, { maxWidth: headerTextWidth });
  }

  // Contatos
  const contactParts = [resume.email, resume.phone, resume.location]
    .map((p) => sanitizeForPdf(p))
    .filter(Boolean);
  if (contactParts.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(226, 232, 240);
    doc.text(contactParts.join("   |   "), textStartX, 30.5, {
      maxWidth: headerTextWidth,
    });
  }

  const linkParts = [resume.linkedinUrl, resume.portfolioUrl]
    .map((p) => sanitizeForPdf(p))
    .filter(Boolean);
  if (linkParts.length > 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(129, 140, 248);
    doc.text(linkParts.join("   |   "), textStartX, 36.5, {
      maxWidth: headerTextWidth,
    });
  }

  let y = headerHeight + 12;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addSection = (title: string, rawBody: string) => {
    const body = sanitizeForPdf(rawBody);
    if (!body) return;
    ensureSpace(18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizeForPdf(title).toUpperCase(), margin, y);

    y += 2.5;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.8);
    doc.setTextColor(51, 65, 85);

    const paragraphs = body.split("\n");
    for (const para of paragraphs) {
      if (!para.trim()) {
        y += 2.5;
        continue;
      }

      const isBullet = para.startsWith("- ");
      const indent = isBullet ? 4 : 0;
      const wrapped = doc.splitTextToSize(
        para,
        contentWidth - indent
      ) as string[];

      for (let i = 0; i < wrapped.length; i++) {
        ensureSpace(6);
        const lineX = i === 0 ? margin : margin + indent;
        doc.text(wrapped[i], lineX, y);
        y += 5;
      }
    }
    y += 4.5;
  };

  addSection("Resumo Profissional", resume.summary);

  if (resume.skills && resume.skills.length > 0) {
    addSection(
      "Habilidades e Tecnologias",
      resume.skills.map((s) => sanitizeForPdf(s)).filter(Boolean).join("  |  ")
    );
  }

  addSection("Experiência Profissional", resume.experience);
  addSection("Formação Acadêmica", resume.education);
  addSection("Idiomas", resume.languages);
  addSection("Certificações e Cursos", resume.certifications);

  const safeFile = (sanitizeForPdf(resume.fullName) || "curriculo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  doc.save(`${safeFile || "curriculo"}-haf.pdf`);
}

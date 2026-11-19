import { jsPDF } from "jspdf";
import type { ResumeData } from "@/components/ResumeBuilder";

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
  doc.setFillColor(15, 23, 42); // slate-900
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

  // Nome e Cargo
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(resume.fullName || "Seu Nome Completo", textStartX, 16);

  const roleLine = [resume.targetRole, resume.seniority, resume.workModel]
    .filter(Boolean)
    .join(" • ");
  if (roleLine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(roleLine, textStartX, 23);
  }

  // Contatos
  const contactParts = [
    resume.email,
    resume.phone,
    resume.location,
  ].filter(Boolean);
  if (contactParts.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(226, 232, 240); // slate-200
    doc.text(contactParts.join("   |   "), textStartX, 31);
  }

  const linkParts = [resume.linkedinUrl, resume.portfolioUrl].filter(Boolean);
  if (linkParts.length > 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(129, 140, 248); // indigo-400
    doc.text(linkParts.join("   |   "), textStartX, 37);
  }

  let y = headerHeight + 12;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addSection = (title: string, body: string) => {
    if (!body || !body.trim()) return;
    ensureSpace(18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), margin, y);

    y += 2.5;
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // slate-700

    const lines = doc.splitTextToSize(body.trim(), contentWidth) as string[];
    for (const line of lines) {
      ensureSpace(6);
      doc.text(line, margin, y);
      y += 5.2;
    }
    y += 5;
  };

  addSection("Resumo Profissional", resume.summary);

  if (resume.skills && resume.skills.length > 0) {
    addSection("Habilidades & Tecnologias", resume.skills.join("  •  "));
  }

  addSection("Experiência Profissional", resume.experience);
  addSection("Formação Acadêmica", resume.education);
  addSection("Idiomas", resume.languages);
  addSection("Certificações & Cursos", resume.certifications);

  const safeName = (resume.fullName || "curriculo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  doc.save(`${safeName || "curriculo"}-haf.pdf`);
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Camera,
  Check,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FileText,
  GraduationCap,
  Plus,
  Rocket,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import {
  downloadProfessionalResumePdf,
  downloadResumeTxt,
  type ResumePdfTemplate,
} from "@/lib/generateResumePdf";

export interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  targetRole: string;
  seniority: string;
  workModel: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  skills: string[];
  summary: string;
  experience: string;
  education: string;
  languages: string;
  certifications: string;
  photoUrl: string;
}

export interface DbResumeRow {
  full_name?: string;
  email?: string;
  phone?: string;
  target_role?: string;
  seniority?: string;
  work_model?: string;
  location?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  skills?: string[];
  summary?: string;
  experience?: string;
  education?: string;
  languages?: string;
  certifications?: string;
  photo_url?: string;
}

interface ResumeBuilderProps {
  initialResume: DbResumeRow | null;
  onSaved: (message: string, goToJobs?: boolean) => Promise<void>;
}

const SKILL_CATEGORIES: Record<string, string[]> = {
  Frontend: [
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Vue",
    "Angular",
    "Tailwind",
    "HTML/CSS",
    "React Native",
  ],
  Backend: [
    "Node.js",
    "Python",
    "Django",
    "FastAPI",
    "Java",
    "Spring Boot",
    "C#",
    ".NET",
    "Go",
    "PHP",
    "GraphQL",
  ],
  "Dados & IA": [
    "SQL",
    "PostgreSQL",
    "MongoDB",
    "Power BI",
    "Excel",
    "Pandas",
    "Machine Learning",
    "LLM / IA",
    "Spark",
  ],
  "Cloud & DevOps": [
    "Docker",
    "Kubernetes",
    "AWS",
    "Azure",
    "GCP",
    "Git",
    "Linux",
    "CI/CD",
    "Terraform",
  ],
  "Produto & Design": [
    "Figma",
    "UI/UX Design",
    "Design System",
    "Prototipagem",
    "Product Discovery",
    "Testes Automatizados",
    "Cypress",
    "Playwright",
  ],
  Gestão: [
    "Scrum",
    "Kanban",
    "Jira",
    "Liderança Técnica",
    "OKRs",
    "Comunicação",
  ],
};

const SKILL_CATEGORY_KEYS = Object.keys(SKILL_CATEGORIES);

const IMPACT_BULLETS: Array<{ label: string; text: string }> = [
  {
    label: "+ Redução de tempo/custo",
    text: "- Reduzi em [X]% o tempo de processamento / custos operacionais por meio de otimização e automação.",
  },
  {
    label: "+ Arquitetura / Escalabilidade",
    text: "- Projetei e implementei arquitetura escalável atendendo [X] mil usuários com foco em performance e testes.",
  },
  {
    label: "+ Liderança / Mentoria",
    text: "- Colaborei com squad multidisciplinar conduzindo code reviews, alinhamento técnico e mentoria de equipe.",
  },
];

const TEMPLATE_OPTIONS: Array<{
  id: ResumePdfTemplate;
  label: string;
  desc: string;
}> = [
  { id: "executivo", label: "Executivo", desc: "Cabeçalho escuro + foto" },
  { id: "moderno", label: "Moderno Azul", desc: "Azul Indeed + destaque" },
  { id: "ats", label: "ATS Puro", desc: "Branco P&B p/ robôs (Gupy/Indeed)" },
];

function mapDbToForm(r: DbResumeRow | null): ResumeData {
  return {
    fullName: r?.full_name || "",
    email: r?.email || "",
    phone: r?.phone || "",
    targetRole: r?.target_role || "",
    seniority: r?.seniority || "",
    workModel: r?.work_model || "",
    location: r?.location || "",
    linkedinUrl: r?.linkedin_url || "",
    portfolioUrl: r?.portfolio_url || "",
    skills: Array.isArray(r?.skills) ? r.skills : [],
    summary: r?.summary || "",
    experience: r?.experience || "",
    education: r?.education || "",
    languages: r?.languages || "",
    certifications: r?.certifications || "",
    photoUrl: r?.photo_url || "",
  };
}

function compressPhotoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 240;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível"));

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Imagem inválida"));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Erro ao ler imagem"));
    reader.readAsDataURL(file);
  });
}

export default function ResumeBuilder({
  initialResume,
  onSaved,
}: ResumeBuilderProps) {
  const [form, setForm] = useState<ResumeData>(() => mapDbToForm(initialResume));

  useEffect(() => {
    if (!initialResume) return;
    const rafId = requestAnimationFrame(() => {
      setForm(mapDbToForm(initialResume));
    });
    return () => cancelAnimationFrame(rafId);
  }, [initialResume]);

  const [skillInput, setSkillInput] = useState("");
  const [activeSkillCategory, setActiveSkillCategory] =
    useState<string>("Frontend");
  const [pdfTemplate, setPdfTemplate] =
    useState<ResumePdfTemplate>("executivo");
  const [parsingPdf, setParsingPdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Assistente rápido de Experiência
  const [showExpHelper, setShowExpHelper] = useState(false);
  const [expCompany, setExpCompany] = useState("");
  const [expRole, setExpRole] = useState("");
  const [expPeriod, setExpPeriod] = useState("");
  const [expDesc, setExpDesc] = useState("");

  // Assistente rápido de Formação
  const [showEduHelper, setShowEduHelper] = useState(false);
  const [eduCourse, setEduCourse] = useState("");
  const [eduSchool, setEduSchool] = useState("");
  const [eduPeriod, setEduPeriod] = useState("");

  const atsAnalysis = useMemo(() => {
    let score = 0;
    const tips: string[] = [];

    const hasIdentity =
      Boolean(form.fullName.trim()) && Boolean(form.email.trim());
    if (hasIdentity) {
      score += 15;
    } else {
      tips.push("Preencha nome completo e e-mail");
    }

    if (form.phone.trim() && form.location.trim()) {
      score += 10;
    } else {
      tips.push("Informe telefone e cidade/estado");
    }

    if (form.targetRole.trim()) {
      score += 10;
    } else {
      tips.push("Defina seu cargo desejado");
    }

    if (form.skills.length >= 6) {
      score += 15;
    } else if (form.skills.length >= 1) {
      score += 8;
      tips.push(`Adicione pelo menos ${6 - form.skills.length} skill(s)`);
    } else {
      tips.push("Adicione 6+ habilidades técnicas");
    }

    const summaryLen = form.summary.trim().length;
    if (summaryLen >= 120 && summaryLen <= 600) {
      score += 15;
    } else if (summaryLen > 0) {
      score += 7;
      tips.push(
        summaryLen < 120
          ? "Expanda o resumo para 120–600 caracteres"
          : "Enxugue o resumo para até 600 caracteres"
      );
    } else {
      tips.push("Escreva (ou gere) um resumo profissional");
    }

    const expTrimmed = form.experience.trim();
    if (expTrimmed && /\d/.test(expTrimmed)) {
      score += 15;
    } else if (expTrimmed) {
      score += 8;
      tips.push("Inclua números/métricas de resultado na experiência");
    } else {
      tips.push("Adicione sua experiência ou projetos");
    }

    if (form.education.trim()) {
      score += 10;
    } else {
      tips.push("Adicione formação acadêmica ou cursos");
    }

    if (form.linkedinUrl.trim() || form.portfolioUrl.trim()) {
      score += 5;
    } else {
      tips.push("Inclua LinkedIn ou GitHub/Portfólio");
    }

    if (form.languages.trim() || form.certifications.trim()) {
      score += 5;
    } else {
      tips.push("Adicione idiomas ou certificações");
    }

    const badge =
      score >= 85 ? "Excelente" : score >= 65 ? "Bom" : "Em construção";

    return { score, tips, badge };
  }, [form]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressPhotoToDataUrl(file);
      setForm((prev) => ({ ...prev, photoUrl: dataUrl }));
      setFeedback("Foto adicionada ao currículo!");
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "Erro ao processar foto"
      );
    } finally {
      e.target.value = "";
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingPdf(true);
    setFeedback(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resume/parse-pdf", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao ler PDF");

      const p = json.parsed as Partial<ResumeData>;
      setForm((prev) => ({
        ...prev,
        fullName: p.fullName || prev.fullName,
        email: p.email || prev.email,
        phone: p.phone || prev.phone,
        targetRole: p.targetRole || prev.targetRole,
        seniority: p.seniority || prev.seniority,
        linkedinUrl: p.linkedinUrl || prev.linkedinUrl,
        portfolioUrl: p.portfolioUrl || prev.portfolioUrl,
        languages: p.languages || prev.languages,
        skills:
          p.skills && p.skills.length > 0
            ? Array.from(new Set([...prev.skills, ...p.skills]))
            : prev.skills,
        summary: p.summary || prev.summary,
        experience: p.experience || prev.experience,
        education: p.education || prev.education,
      }));
      setFeedback(
        "PDF lido com sucesso! Os campos foram preenchidos automaticamente."
      );
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "Não foi possível ler o PDF."
      );
    } finally {
      setParsingPdf(false);
      e.target.value = "";
    }
  };

  const handleExportJsonBackup = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      resume: form,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "curriculo-haf-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    setFeedback("Backup JSON do currículo exportado!");
  };

  const handleRestoreJsonBackup = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        resume?: Partial<ResumeData>;
      } & Partial<ResumeData>;
      const src = parsed.resume || parsed;
      setForm((prev) => ({
        fullName: typeof src.fullName === "string" ? src.fullName : prev.fullName,
        email: typeof src.email === "string" ? src.email : prev.email,
        phone: typeof src.phone === "string" ? src.phone : prev.phone,
        targetRole:
          typeof src.targetRole === "string" ? src.targetRole : prev.targetRole,
        seniority:
          typeof src.seniority === "string" ? src.seniority : prev.seniority,
        workModel:
          typeof src.workModel === "string" ? src.workModel : prev.workModel,
        location: typeof src.location === "string" ? src.location : prev.location,
        linkedinUrl:
          typeof src.linkedinUrl === "string"
            ? src.linkedinUrl
            : prev.linkedinUrl,
        portfolioUrl:
          typeof src.portfolioUrl === "string"
            ? src.portfolioUrl
            : prev.portfolioUrl,
        skills: Array.isArray(src.skills) ? src.skills.map(String) : prev.skills,
        summary: typeof src.summary === "string" ? src.summary : prev.summary,
        experience:
          typeof src.experience === "string" ? src.experience : prev.experience,
        education:
          typeof src.education === "string" ? src.education : prev.education,
        languages:
          typeof src.languages === "string" ? src.languages : prev.languages,
        certifications:
          typeof src.certifications === "string"
            ? src.certifications
            : prev.certifications,
        photoUrl: typeof src.photoUrl === "string" ? src.photoUrl : prev.photoUrl,
      }));
      setFeedback("Currículo restaurado a partir do backup JSON!");
    } catch {
      setFeedback("Arquivo JSON inválido para restauração.");
    } finally {
      e.target.value = "";
    }
  };

  const handleGenerateSummarySuggestion = () => {
    const rolePart = form.targetRole.trim() || "Desenvolvedor(a) de Software";
    const seniorityPart = form.seniority.trim()
      ? ` de nível ${form.seniority.trim()}`
      : "";
    const locationPart = form.location.trim()
      ? ` com base em ${form.location.trim()}`
      : "";
    const workPart = form.workModel.trim()
      ? ` e disponibilidade para atuação ${form.workModel.trim().toLowerCase()}`
      : "";
    const topSkills = form.skills.slice(0, 6).join(", ");
    const skillsSentence = topSkills
      ? ` Experiência prática com ${topSkills}, entregando soluções escaláveis, código limpo e foco em resultados mensuráveis.`
      : " Foco em entregas escaláveis, boas práticas de engenharia e colaboração contínua com produto e tecnologia.";

    const suggestion = `Profissional atuando como ${rolePart}${seniorityPart}${locationPart}${workPart}.${skillsSentence} Busco novos desafios onde possa gerar impacto rápido no produto e evoluir tecnicamente com a equipe.`;

    setForm((prev) => ({ ...prev, summary: suggestion }));
    setFeedback(
      "Sugestão de resumo gerada! Você pode personalizar números e detalhes antes de salvar."
    );
  };

  const addSkill = (value?: string) => {
    const term = (value ?? skillInput).trim();
    if (!term) return;
    if (!form.skills.some((s) => s.toLowerCase() === term.toLowerCase())) {
      setForm((prev) => ({ ...prev, skills: [...prev.skills, term] }));
    }
    if (!value) setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const appendImpactBullet = (bulletText: string) => {
    setForm((prev) => ({
      ...prev,
      experience: prev.experience.trim()
        ? `${prev.experience.trimEnd()}\n${bulletText}`
        : bulletText,
    }));
  };

  const handleInsertExperience = () => {
    if (!expCompany.trim() && !expRole.trim()) return;
    const header = [expCompany.trim(), expRole.trim(), expPeriod.trim()]
      .filter(Boolean)
      .join(" — ");
    const bullets = expDesc
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.startsWith("-") ? l : `- ${l}`))
      .join("\n");
    const block = [header, bullets].filter(Boolean).join("\n");
    setForm((prev) => ({
      ...prev,
      experience: prev.experience.trim()
        ? `${prev.experience.trim()}\n\n${block}`
        : block,
    }));
    setExpCompany("");
    setExpRole("");
    setExpPeriod("");
    setExpDesc("");
    setShowExpHelper(false);
  };

  const handleInsertEducation = () => {
    if (!eduCourse.trim() && !eduSchool.trim()) return;
    const block = [
      eduCourse.trim(),
      [eduSchool.trim(), eduPeriod.trim()].filter(Boolean).join(" | "),
    ]
      .filter(Boolean)
      .join("\n");
    setForm((prev) => ({
      ...prev,
      education: prev.education.trim()
        ? `${prev.education.trim()}\n\n${block}`
        : block,
    }));
    setEduCourse("");
    setEduSchool("");
    setEduPeriod("");
    setShowEduHelper(false);
  };

  const submitResume = async (autoSearch: boolean) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, autoSearch }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar currículo");

      if (autoSearch && json.scrapeResult) {
        await onSaved(
          `Currículo salvo! Varremos ${json.scrapeResult.sourcesChecked} fontes: ${json.scrapeResult.jobsFound} vagas compatíveis (${json.scrapeResult.newJobsCount} novas).`,
          true
        );
      } else {
        await onSaved(
          "Currículo salvo e palavras-chave sincronizadas com sucesso!",
          false
        );
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const selectedTemplateMeta =
    TEMPLATE_OPTIONS.find((t) => t.id === pdfTemplate) || TEMPLATE_OPTIONS[0];
  const categorySkills = SKILL_CATEGORIES[activeSkillCategory] || [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Barra Superior: Importação + ATS Score */}
      <div className="grid gap-4 lg:grid-cols-12">
        <section className="gupy-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center lg:col-span-7">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--accent-bg)]">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Estúdio de Currículo Profissional &amp; ATS
              </h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Importe seu PDF atual ou restaure um backup JSON, otimize para
              filtros ATS (Gupy, Indeed, Greenhouse) e exporte em 3 modelos.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="indeed-btn-primary inline-flex cursor-pointer items-center gap-2 px-3.5 py-2 text-xs">
                <Upload className="h-3.5 w-3.5" />
                {parsingPdf ? "Lendo PDF..." : "Importar PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  disabled={parsingPdf}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleExportJsonBackup}
                className="indeed-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
              >
                <FileJson className="h-3.5 w-3.5 text-[var(--accent-bg)]" />
                Backup JSON
              </button>

              <label className="indeed-btn-secondary inline-flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs">
                <Upload className="h-3.5 w-3.5" />
                Restaurar JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleRestoreJsonBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </section>

        {/* Pontuação ATS */}
        <section className="gupy-card flex flex-col justify-center p-5 lg:col-span-5">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[var(--text-primary)]">
              Score ATS do Currículo
            </span>
            <div className="flex items-center gap-2">
              <span className="indeed-check-pill">{atsAnalysis.badge}</span>
              <span className="text-sm font-black text-[var(--accent-bg)]">
                {atsAnalysis.score}/100
              </span>
            </div>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
            <div
              className="h-full rounded-full bg-[var(--accent-bg)] transition-all duration-300"
              style={{ width: `${Math.max(4, atsAnalysis.score)}%` }}
            />
          </div>

          {atsAnalysis.tips.length === 0 ? (
            <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Currículo completo e pronto para sistemas ATS!
            </p>
          ) : (
            <p className="mt-2.5 text-[11px] text-[var(--text-secondary)]">
              <strong>Para 100/100:</strong>{" "}
              {atsAnalysis.tips.slice(0, 3).join(" · ")}
            </p>
          )}
        </section>
      </div>

      {feedback && (
        <div className="gupy-card border-l-4 border-l-emerald-500 px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
          {feedback}
        </div>
      )}

      {/* Formulário Construtor Completo */}
      <section className="gupy-card p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--accent-bg)]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Construtor de Currículo
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Modelo PDF */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-subtle)] p-1">
              {TEMPLATE_OPTIONS.map((tpl) => {
                const active = pdfTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setPdfTemplate(tpl.id)}
                    title={tpl.desc}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      active
                        ? "bg-[var(--accent-bg)] text-white"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {tpl.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="indeed-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Ocultar Prévia
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Prévia A4
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => downloadResumeTxt(form)}
              className="indeed-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
              title="Baixar texto puro para colar em formulários ATS"
            >
              <Download className="h-3.5 w-3.5" />
              .TXT ATS
            </button>

            <button
              type="button"
              onClick={() => downloadProfessionalResumePdf(form, pdfTemplate)}
              className="indeed-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Gerar PDF ({selectedTemplateMeta.label})
            </button>
          </div>
        </div>

        {/* Prévia ao vivo estilo A4 refletindo o modelo escolhido */}
        {showPreview && (
          <div className="mb-6 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-white text-slate-900 shadow-lg">
            {pdfTemplate === "ats" ? (
              <div className="border-b-2 border-slate-500 px-6 py-5">
                <h3 className="text-xl font-bold text-slate-900">
                  {form.fullName || "Seu Nome Completo"}
                </h3>
                <p className="mt-0.5 text-sm font-semibold text-slate-700">
                  {[form.targetRole, form.seniority, form.workModel]
                    .filter(Boolean)
                    .join("  |  ") || "Cargo desejado"}
                </p>
                <p className="mt-1 text-xs text-slate-700">
                  {[form.email, form.phone, form.location]
                    .filter(Boolean)
                    .join("  |  ")}
                </p>
                {(form.linkedinUrl || form.portfolioUrl) && (
                  <p className="mt-0.5 text-xs text-slate-600">
                    {[form.linkedinUrl, form.portfolioUrl]
                      .filter(Boolean)
                      .join("  |  ")}
                  </p>
                )}
              </div>
            ) : (
              <div
                className={`flex items-center gap-5 px-6 py-5 text-white ${
                  pdfTemplate === "moderno" ? "bg-[#164081]" : "bg-slate-900"
                }`}
              >
                {form.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.photoUrl}
                    alt="Foto"
                    className="h-20 w-20 rounded-lg border border-white/25 object-cover"
                  />
                )}
                <div>
                  <h3 className="text-xl font-bold">
                    {form.fullName || "Seu Nome Completo"}
                  </h3>
                  <p
                    className={`text-sm ${
                      pdfTemplate === "moderno"
                        ? "text-blue-200"
                        : "text-slate-300"
                    }`}
                  >
                    {[form.targetRole, form.seniority, form.workModel]
                      .filter(Boolean)
                      .join("  |  ") || "Cargo desejado"}
                  </p>
                  <p className="mt-1 text-xs text-slate-200">
                    {[form.email, form.phone, form.location]
                      .filter(Boolean)
                      .join("   |   ")}
                  </p>
                  {(form.linkedinUrl || form.portfolioUrl) && (
                    <p
                      className={`mt-0.5 text-[11px] ${
                        pdfTemplate === "moderno"
                          ? "text-blue-100"
                          : "text-indigo-300"
                      }`}
                    >
                      {[form.linkedinUrl, form.portfolioUrl]
                        .filter(Boolean)
                        .join("   |   ")}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4 p-6 text-sm">
              {form.summary && (
                <div>
                  <h4
                    className={`border-b pb-1 text-xs font-bold uppercase ${
                      pdfTemplate === "moderno"
                        ? "border-blue-300 text-[#164081]"
                        : "border-slate-300 text-slate-900"
                    }`}
                  >
                    Resumo Profissional
                  </h4>
                  <p className="mt-2 whitespace-pre-line text-slate-700">
                    {form.summary}
                  </p>
                </div>
              )}
              {form.skills.length > 0 && (
                <div>
                  <h4
                    className={`border-b pb-1 text-xs font-bold uppercase ${
                      pdfTemplate === "moderno"
                        ? "border-blue-300 text-[#164081]"
                        : "border-slate-300 text-slate-900"
                    }`}
                  >
                    Habilidades e Tecnologias
                  </h4>
                  <p className="mt-2 text-slate-700">
                    {form.skills.join("  |  ")}
                  </p>
                </div>
              )}
              {form.experience && (
                <div>
                  <h4
                    className={`border-b pb-1 text-xs font-bold uppercase ${
                      pdfTemplate === "moderno"
                        ? "border-blue-300 text-[#164081]"
                        : "border-slate-300 text-slate-900"
                    }`}
                  >
                    Experiência Profissional
                  </h4>
                  <p className="mt-2 whitespace-pre-line text-slate-700">
                    {form.experience}
                  </p>
                </div>
              )}
              {form.education && (
                <div>
                  <h4
                    className={`border-b pb-1 text-xs font-bold uppercase ${
                      pdfTemplate === "moderno"
                        ? "border-blue-300 text-[#164081]"
                        : "border-slate-300 text-slate-900"
                    }`}
                  >
                    Formação Acadêmica
                  </h4>
                  <p className="mt-2 whitespace-pre-line text-slate-700">
                    {form.education}
                  </p>
                </div>
              )}
              {form.languages && (
                <div>
                  <h4
                    className={`border-b pb-1 text-xs font-bold uppercase ${
                      pdfTemplate === "moderno"
                        ? "border-blue-300 text-[#164081]"
                        : "border-slate-300 text-slate-900"
                    }`}
                  >
                    Idiomas
                  </h4>
                  <p className="mt-2 text-slate-700">{form.languages}</p>
                </div>
              )}
              {form.certifications && (
                <div>
                  <h4
                    className={`border-b pb-1 text-xs font-bold uppercase ${
                      pdfTemplate === "moderno"
                        ? "border-blue-300 text-[#164081]"
                        : "border-slate-300 text-slate-900"
                    }`}
                  >
                    Certificações e Cursos
                  </h4>
                  <p className="mt-2 text-slate-700">{form.certifications}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Foto + Dados Pessoais */}
        <div className="gupy-subcard mb-6 flex flex-col items-start gap-5 p-4 sm:flex-row sm:items-center">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
            {form.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.photoUrl}
                alt="Foto do currículo"
                className="h-full w-full object-cover"
              />
            ) : (
              <Camera className="h-7 w-7 text-[var(--text-muted)]" />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-[var(--text-primary)]">
              Foto do Perfil (opcional)
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Incluída automaticamente nos modelos{" "}
              <strong>Executivo</strong> e <strong>Moderno Azul</strong> (oculta
              no modelo <strong>ATS Puro</strong>).
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="indeed-btn-secondary inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs">
                <Camera className="h-3.5 w-3.5" />
                {form.photoUrl ? "Trocar foto" : "Enviar foto"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {form.photoUrl && (
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, photoUrl: "" }))}
                  className="indeed-btn-secondary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Nome completo
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Ex: Higor Amaral"
              className="w-full px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              E-mail profissional (e alertas)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="seu-email@exemplo.com"
              className="w-full px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Cargo desejado
            </label>
            <input
              type="text"
              value={form.targetRole}
              onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
              placeholder="Ex: Desenvolvedor Full Stack"
              className="w-full px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Senioridade
              </label>
              <select
                value={form.seniority}
                onChange={(e) =>
                  setForm({ ...form, seniority: e.target.value })
                }
                className="w-full px-3 py-2 text-sm outline-none"
              >
                <option value="">Selecione...</option>
                <option value="Estágio">Estágio</option>
                <option value="Júnior">Júnior</option>
                <option value="Pleno">Pleno</option>
                <option value="Sênior">Sênior</option>
                <option value="Especialista / Lead">Especialista / Lead</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Modelo de trabalho
              </label>
              <select
                value={form.workModel}
                onChange={(e) =>
                  setForm({ ...form, workModel: e.target.value })
                }
                className="w-full px-3 py-2 text-sm outline-none"
              >
                <option value="">Qualquer</option>
                <option value="Remoto">Remoto</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Presencial">Presencial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Telefone / WhatsApp
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(47) 99999-9999"
              className="w-full px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Cidade / Estado
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ex: Joinville, SC"
              className="w-full px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              LinkedIn
            </label>
            <input
              type="url"
              value={form.linkedinUrl}
              onChange={(e) =>
                setForm({ ...form, linkedinUrl: e.target.value })
              }
              placeholder="https://linkedin.com/in/seu-perfil"
              className="w-full px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              GitHub / Portfólio
            </label>
            <input
              type="url"
              value={form.portfolioUrl}
              onChange={(e) =>
                setForm({ ...form, portfolioUrl: e.target.value })
              }
              placeholder="https://github.com/seu-usuario"
              className="w-full px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        {/* Habilidades + Banco Categorizado */}
        <div className="gupy-subcard mt-5 p-4">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold text-[var(--text-primary)]">
              Habilidades / Tecnologias ({form.skills.length} selecionadas —
              sincronizadas com as vagas)
            </label>
            {form.skills.length > 0 && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, skills: [] }))}
                className="text-[11px] font-semibold text-rose-600 hover:underline dark:text-rose-400"
              >
                Limpar skills
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Digite uma skill (ex: React, Python, SQL) e aperte Enter"
              className="w-full px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => addSkill()}
              className="indeed-btn-primary px-3 py-2 text-sm"
              aria-label="Adicionar skill"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {form.skills.map((skill) => (
              <span
                key={skill}
                className="indeed-check-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
              >
                <Check className="h-3 w-3" />
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-0.5 font-bold hover:text-rose-600"
                  aria-label={`Remover ${skill}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="mt-4 border-t border-[var(--border-color)] pt-3">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold text-[var(--text-muted)]">
                Banco rápido por área:
              </span>
              {SKILL_CATEGORY_KEYS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveSkillCategory(cat)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                    activeSkillCategory === cat
                      ? "indeed-pill-active"
                      : "indeed-pill"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {categorySkills
                .filter(
                  (s) =>
                    !form.skills.some(
                      (cur) => cur.toLowerCase() === s.toLowerCase()
                    )
                )
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSkill(s)}
                    className="indeed-badge px-2.5 py-1 text-[11px] transition hover:border-[var(--accent-ring)] hover:text-[var(--accent-bg)]"
                  >
                    + {s}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Resumo, Experiência (com assistente e chips de impacto), Formação (com assistente) */}
        <div className="mt-5 grid gap-4">
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Resumo Profissional ({form.summary.trim().length} caracteres ·
                ideal 120–600)
              </label>
              <button
                type="button"
                onClick={handleGenerateSummarySuggestion}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent-bg)] hover:underline"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Gerar sugestão de resumo
              </button>
            </div>
            <textarea
              rows={3}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Conte brevemente sobre sua trajetória, especialidades e objetivos..."
              className="w-full px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Experiência */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Experiência Profissional
                </label>
                <button
                  type="button"
                  onClick={() => setShowExpHelper((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent-bg)] hover:underline"
                >
                  <Briefcase className="h-3 w-3" />
                  {showExpHelper
                    ? "Fechar assistente"
                    : "+ Adicionar experiência"}
                </button>
              </div>

              {showExpHelper && (
                <div className="gupy-subcard space-y-2 p-3">
                  <input
                    type="text"
                    value={expCompany}
                    onChange={(e) => setExpCompany(e.target.value)}
                    placeholder="Empresa (ex: Tech Corp)"
                    className="w-full px-2.5 py-1.5 text-xs outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={expRole}
                      onChange={(e) => setExpRole(e.target.value)}
                      placeholder="Cargo"
                      className="w-full px-2.5 py-1.5 text-xs outline-none"
                    />
                    <input
                      type="text"
                      value={expPeriod}
                      onChange={(e) => setExpPeriod(e.target.value)}
                      placeholder="Período (2023 - 2025)"
                      className="w-full px-2.5 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    placeholder="Atividades e resultados com métricas (uma por linha)"
                    className="w-full px-2.5 py-1.5 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleInsertExperience}
                    className="indeed-btn-primary w-full py-1.5 text-xs"
                  >
                    Inserir no campo abaixo
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {IMPACT_BULLETS.map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => appendImpactBullet(b.text)}
                    className="indeed-badge px-2 py-0.5 text-[11px] transition hover:border-[var(--accent-ring)] hover:text-[var(--accent-bg)]"
                    title="Inserir modelo de tópico com impacto mensurável"
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <textarea
                rows={6}
                value={form.experience}
                onChange={(e) =>
                  setForm({ ...form, experience: e.target.value })
                }
                placeholder="Empresa — Cargo | 2023 - Atual&#10;- Principais entregas e resultados com números..."
                className="w-full px-3 py-2 text-sm outline-none"
              />
            </div>

            {/* Formação */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Formação Acadêmica
                </label>
                <button
                  type="button"
                  onClick={() => setShowEduHelper((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent-bg)] hover:underline"
                >
                  <GraduationCap className="h-3 w-3" />
                  {showEduHelper ? "Fechar assistente" : "+ Adicionar formação"}
                </button>
              </div>

              {showEduHelper && (
                <div className="gupy-subcard space-y-2 p-3">
                  <input
                    type="text"
                    value={eduCourse}
                    onChange={(e) => setEduCourse(e.target.value)}
                    placeholder="Curso (ex: Bacharelado em Sistemas)"
                    className="w-full px-2.5 py-1.5 text-xs outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={eduSchool}
                      onChange={(e) => setEduSchool(e.target.value)}
                      placeholder="Instituição"
                      className="w-full px-2.5 py-1.5 text-xs outline-none"
                    />
                    <input
                      type="text"
                      value={eduPeriod}
                      onChange={(e) => setEduPeriod(e.target.value)}
                      placeholder="Conclusão / Em andamento"
                      className="w-full px-2.5 py-1.5 text-xs outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleInsertEducation}
                    className="indeed-btn-primary w-full py-1.5 text-xs"
                  >
                    Inserir no campo abaixo
                  </button>
                </div>
              )}

              <textarea
                rows={7}
                value={form.education}
                onChange={(e) =>
                  setForm({ ...form, education: e.target.value })
                }
                placeholder="Curso&#10;Instituição | Ano"
                className="w-full px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Idiomas
              </label>
              <input
                type="text"
                value={form.languages}
                onChange={(e) =>
                  setForm({ ...form, languages: e.target.value })
                }
                placeholder="Ex: Português (Nativo), Inglês (Avançado)"
                className="w-full px-3 py-2 text-sm outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Certificações &amp; Cursos
              </label>
              <input
                type="text"
                value={form.certifications}
                onChange={(e) =>
                  setForm({ ...form, certifications: e.target.value })
                }
                placeholder="Ex: AWS Cloud Practitioner, Rocketseat..."
                className="w-full px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-color)] pt-5">
          <button
            type="button"
            onClick={() => downloadResumeTxt(form)}
            className="indeed-btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            <Download className="h-4 w-4" />
            Baixar .TXT
          </button>

          <button
            type="button"
            onClick={() => downloadProfessionalResumePdf(form, pdfTemplate)}
            className="indeed-btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
          >
            <Download className="h-4 w-4 text-[var(--accent-bg)]" />
            Gerar PDF ({selectedTemplateMeta.label})
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => submitResume(false)}
            className="indeed-btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Salvar Currículo
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => submitResume(true)}
            className="indeed-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
          >
            <Rocket className="h-4 w-4" />
            {saving
              ? "Buscando em todas as fontes..."
              : "Salvar e Buscar Vagas em Todas as Fontes"}
          </button>
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Camera,
  Download,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Plus,
  Rocket,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { downloadProfessionalResumePdf } from "@/lib/generateResumePdf";

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

const SUGGESTED_SKILLS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Django",
  "Vue",
  "SQL",
  "PostgreSQL",
  "Docker",
  "Git",
  "Linux",
  "AWS",
  "Tailwind",
  "Java",
  "C#",
  "Excel",
  "Power BI",
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
    if (initialResume) {
      setForm(mapDbToForm(initialResume));
    }
  }, [initialResume]);

  const [skillInput, setSkillInput] = useState("");
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

  const completeness = useMemo(() => {
    const checks = [
      Boolean(form.fullName.trim()),
      Boolean(form.email.trim()),
      Boolean(form.targetRole.trim()),
      Boolean(form.phone.trim() || form.location.trim()),
      form.skills.length >= 3,
      Boolean(form.summary.trim()),
      Boolean(form.experience.trim()),
      Boolean(form.education.trim()),
      Boolean(form.linkedinUrl.trim() || form.portfolioUrl.trim()),
      Boolean(form.photoUrl),
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
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

  return (
    <div className="space-y-6">
      {/* Barra de Completude + Upload PDF */}
      <div className="grid gap-4 lg:grid-cols-12">
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 sm:flex-row sm:items-center lg:col-span-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-300">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-base font-semibold">
                Importar PDF ou Construir Manualmente
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Envie seu currículo atual em PDF para preencher automaticamente ou
              edite abaixo e exporte um novo PDF profissional.
            </p>
          </div>

          <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">
            <Upload className="h-4 w-4" />
            {parsingPdf ? "Lendo PDF..." : "Importar PDF"}
            <input
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
              disabled={parsingPdf}
              className="hidden"
            />
          </label>
        </section>

        <section className="flex flex-col justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">
              Completude do currículo
            </span>
            <span className="font-bold text-emerald-400">{completeness}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Quanto mais completo, melhor o match automático com as vagas.
          </p>
        </section>
      </div>

      {feedback && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          {feedback}
        </div>
      )}

      {/* Formulário Construtor Completo */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">Construtor de Currículo</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
            >
              {showPreview ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Ocultar Prévia
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Pré-visualizar
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => downloadProfessionalResumePdf(form)}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/25"
            >
              <Download className="h-4 w-4" />
              Gerar Currículo em PDF
            </button>
          </div>
        </div>

        {/* Prévia ao vivo estilo A4 */}
        {showPreview && (
          <div className="gupy-card mb-6 overflow-hidden">
            <div className="flex items-center gap-5 bg-slate-900 px-6 py-5 text-white">
              {form.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.photoUrl}
                  alt="Foto"
                  className="h-20 w-20 rounded-lg border border-white/20 object-cover"
                />
              )}
              <div>
                <h3 className="text-xl font-bold">
                  {form.fullName || "Seu Nome Completo"}
                </h3>
                <p className="text-sm text-slate-300">
                  {[form.targetRole, form.seniority, form.workModel]
                    .filter(Boolean)
                    .join("  |  ") || "Cargo desejado"}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {[form.email, form.phone, form.location]
                    .filter(Boolean)
                    .join("   |   ")}
                </p>
              </div>
            </div>
            <div className="space-y-4 p-6 text-sm">
              {form.summary && (
                <div>
                  <h4 className="border-b border-slate-200 pb-1 text-xs font-bold uppercase text-slate-900">
                    Resumo Profissional
                  </h4>
                  <p className="mt-2 whitespace-pre-line text-slate-700">
                    {form.summary}
                  </p>
                </div>
              )}
              {form.skills.length > 0 && (
                <div>
                  <h4 className="border-b border-slate-200 pb-1 text-xs font-bold uppercase text-slate-900">
                    Habilidades e Tecnologias
                  </h4>
                  <p className="mt-2 text-slate-700">
                    {form.skills.join("  |  ")}
                  </p>
                </div>
              )}
              {form.experience && (
                <div>
                  <h4 className="border-b border-slate-200 pb-1 text-xs font-bold uppercase text-slate-900">
                    Experiência Profissional
                  </h4>
                  <p className="mt-2 whitespace-pre-line text-slate-700">
                    {form.experience}
                  </p>
                </div>
              )}
              {form.education && (
                <div>
                  <h4 className="border-b border-slate-200 pb-1 text-xs font-bold uppercase text-slate-900">
                    Formação Acadêmica
                  </h4>
                  <p className="mt-2 whitespace-pre-line text-slate-700">
                    {form.education}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Foto + Dados Pessoais */}
        <div className="mb-6 flex flex-col items-start gap-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4 sm:flex-row sm:items-center">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
            {form.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.photoUrl}
                alt="Foto do currículo"
                className="h-full w-full object-cover"
              />
            ) : (
              <Camera className="h-7 w-7 text-slate-500" />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-200">
              Foto do Perfil (opcional)
            </p>
            <p className="text-xs text-slate-400">
              Aparece no cabeçalho do seu currículo em PDF profissional.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
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
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-950/40"
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
            <label className="mb-1 block text-xs text-slate-400">
              Nome completo
            </label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Ex: Higor Amaral"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              E-mail profissional (e alertas)
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="seu-email@exemplo.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Cargo desejado
            </label>
            <input
              type="text"
              value={form.targetRole}
              onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
              placeholder="Ex: Desenvolvedor Full Stack"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Senioridade
              </label>
              <select
                value={form.seniority}
                onChange={(e) =>
                  setForm({ ...form, seniority: e.target.value })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
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
              <label className="mb-1 block text-xs text-slate-400">
                Modelo de trabalho
              </label>
              <select
                value={form.workModel}
                onChange={(e) =>
                  setForm({ ...form, workModel: e.target.value })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Qualquer</option>
                <option value="Remoto">Remoto</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Presencial">Presencial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Telefone / WhatsApp
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(47) 99999-9999"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Cidade / Estado
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ex: Joinville, SC"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              LinkedIn
            </label>
            <input
              type="url"
              value={form.linkedinUrl}
              onChange={(e) =>
                setForm({ ...form, linkedinUrl: e.target.value })
              }
              placeholder="https://linkedin.com/in/seu-perfil"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              GitHub / Portfólio
            </label>
            <input
              type="url"
              value={form.portfolioUrl}
              onChange={(e) =>
                setForm({ ...form, portfolioUrl: e.target.value })
              }
              placeholder="https://github.com/seu-usuario"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Habilidades + Sugestões 1 clique */}
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Habilidades / Tecnologias (usadas para buscar vagas automaticamente)
          </label>
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
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => addSkill()}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {form.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="text-emerald-400 hover:text-rose-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="mt-3 border-t border-slate-800 pt-3">
            <p className="mb-2 text-[11px] text-slate-500">
              Sugestões rápidas (clique para adicionar):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_SKILLS.filter(
                (s) =>
                  !form.skills.some(
                    (cur) => cur.toLowerCase() === s.toLowerCase()
                  )
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addSkill(s)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 transition hover:border-indigo-500 hover:text-indigo-300"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resumo, Experiência (com assistente), Formação (com assistente) */}
        <div className="mt-5 grid gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Resumo Profissional
            </label>
            <textarea
              rows={3}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Conte brevemente sobre sua trajetória, especialidades e objetivos..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Experiência */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">
                  Experiência Profissional
                </label>
                <button
                  type="button"
                  onClick={() => setShowExpHelper((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300"
                >
                  <Briefcase className="h-3 w-3" />
                  {showExpHelper ? "Fechar assistente" : "+ Adicionar experiência"}
                </button>
              </div>

              {showExpHelper && (
                <div className="space-y-2 rounded-xl border border-indigo-500/30 bg-slate-950 p-3">
                  <input
                    type="text"
                    value={expCompany}
                    onChange={(e) => setExpCompany(e.target.value)}
                    placeholder="Empresa (ex: Tech Corp)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={expRole}
                      onChange={(e) => setExpRole(e.target.value)}
                      placeholder="Cargo"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={expPeriod}
                      onChange={(e) => setExpPeriod(e.target.value)}
                      placeholder="Período (2023 - 2025)"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    placeholder="Atividades (uma por linha)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleInsertExperience}
                    className="w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Inserir no campo abaixo
                  </button>
                </div>
              )}

              <textarea
                rows={6}
                value={form.experience}
                onChange={(e) =>
                  setForm({ ...form, experience: e.target.value })
                }
                placeholder="Empresa — Cargo | 2023 - Atual&#10;- Principais entregas e resultados..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            {/* Formação */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400">
                  Formação Acadêmica
                </label>
                <button
                  type="button"
                  onClick={() => setShowEduHelper((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300"
                >
                  <GraduationCap className="h-3 w-3" />
                  {showEduHelper ? "Fechar assistente" : "+ Adicionar formação"}
                </button>
              </div>

              {showEduHelper && (
                <div className="space-y-2 rounded-xl border border-indigo-500/30 bg-slate-950 p-3">
                  <input
                    type="text"
                    value={eduCourse}
                    onChange={(e) => setEduCourse(e.target.value)}
                    placeholder="Curso (ex: Bacharelado em Sistemas)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={eduSchool}
                      onChange={(e) => setEduSchool(e.target.value)}
                      placeholder="Instituição"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      value={eduPeriod}
                      onChange={(e) => setEduPeriod(e.target.value)}
                      placeholder="Conclusão / Em andamento"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleInsertEducation}
                    className="w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    Inserir no campo abaixo
                  </button>
                </div>
              )}

              <textarea
                rows={6}
                value={form.education}
                onChange={(e) =>
                  setForm({ ...form, education: e.target.value })
                }
                placeholder="Curso&#10;Instituição | Ano"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Idiomas
              </label>
              <input
                type="text"
                value={form.languages}
                onChange={(e) =>
                  setForm({ ...form, languages: e.target.value })
                }
                placeholder="Ex: Português (Nativo), Inglês (Avançado)"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Certificações &amp; Cursos
              </label>
              <input
                type="text"
                value={form.certifications}
                onChange={(e) =>
                  setForm({ ...form, certifications: e.target.value })
                }
                placeholder="Ex: AWS Cloud Practitioner, Rocketseat..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => downloadProfessionalResumePdf(form)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2.5 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/25"
          >
            <Download className="h-4 w-4" />
            Gerar PDF
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => submitResume(false)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Salvar Currículo
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => submitResume(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
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

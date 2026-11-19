"use client";

import { useEffect, useState } from "react";
import {
  Camera,
  Download,
  FileText,
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

  const addSkill = () => {
    const term = skillInput.trim();
    if (!term) return;
    if (!form.skills.includes(term)) {
      setForm((prev) => ({ ...prev, skills: [...prev.skills, term] }));
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
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
          `Currículo salvo! Varremos todas as fontes: ${json.scrapeResult.jobsFound} vagas compatíveis encontradas (${json.scrapeResult.newJobsCount} novas).`,
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
      {/* Upload PDF */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-6 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-300">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-base font-semibold">
              Auto-preencher com seu Currículo em PDF
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Envie seu PDF para preencher os campos automaticamente ou monte seu
            currículo abaixo e gere um novo PDF profissional.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">
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

      {feedback && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          {feedback}
        </div>
      )}

      {/* Formulário Construtor Completo */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">Construtor de Currículo</h2>
          </div>

          <button
            type="button"
            onClick={() => downloadProfessionalResumePdf(form)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/25"
          >
            <Download className="h-4 w-4" />
            Gerar Currículo em PDF
          </button>
        </div>

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
              placeholder="(11) 99999-9999"
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
              placeholder="Ex: São Paulo, SP"
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

        {/* Habilidades */}
        <div className="mt-5">
          <label className="mb-1 block text-xs text-slate-400">
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
              onClick={addSkill}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {form.skills.length === 0 && (
              <span className="text-xs text-slate-500">
                Nenhuma habilidade adicionada ainda.
              </span>
            )}
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
        </div>

        {/* Resumo, Experiência, Formação, Idiomas e Certificações */}
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
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Experiência Profissional
              </label>
              <textarea
                rows={5}
                value={form.experience}
                onChange={(e) =>
                  setForm({ ...form, experience: e.target.value })
                }
                placeholder="Empresa • Cargo (2023 - Atual)&#10;- Principais entregas e resultados..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Formação Acadêmica
              </label>
              <textarea
                rows={5}
                value={form.education}
                onChange={(e) =>
                  setForm({ ...form, education: e.target.value })
                }
                placeholder="Curso • Instituição (Conclusão)"
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

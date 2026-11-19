"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Rocket,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";

export interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  targetRole: string;
  seniority: string;
  skills: string[];
  summary: string;
  experience: string;
  education: string;
}

interface DbResumeRow {
  full_name?: string;
  email?: string;
  phone?: string;
  target_role?: string;
  seniority?: string;
  skills?: string[];
  summary?: string;
  experience?: string;
  education?: string;
}

interface ResumeBuilderProps {
  initialResume: DbResumeRow | null;
  onSaved: (message: string, goToJobs?: boolean) => Promise<void>;
}

export default function ResumeBuilder({
  initialResume,
  onSaved,
}: ResumeBuilderProps) {
  const [form, setForm] = useState<ResumeData>({
    fullName: initialResume?.full_name || "",
    email: initialResume?.email || "",
    phone: initialResume?.phone || "",
    targetRole: initialResume?.target_role || "",
    seniority: initialResume?.seniority || "",
    skills: Array.isArray(initialResume?.skills) ? initialResume.skills : [],
    summary: initialResume?.summary || "",
    experience: initialResume?.experience || "",
    education: initialResume?.education || "",
  });

  useEffect(() => {
    if (!initialResume) return;
    setForm({
      fullName: initialResume.full_name || "",
      email: initialResume.email || "",
      phone: initialResume.phone || "",
      targetRole: initialResume.target_role || "",
      seniority: initialResume.seniority || "",
      skills: Array.isArray(initialResume.skills) ? initialResume.skills : [],
      summary: initialResume.summary || "",
      experience: initialResume.experience || "",
      education: initialResume.education || "",
    });
  }, [initialResume]);

  const [skillInput, setSkillInput] = useState("");
  const [parsingPdf, setParsingPdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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

      const p = json.parsed as ResumeData;
      setForm((prev) => ({
        fullName: p.fullName || prev.fullName,
        email: p.email || prev.email,
        phone: p.phone || prev.phone,
        targetRole: p.targetRole || prev.targetRole,
        seniority: p.seniority || prev.seniority,
        skills:
          p.skills && p.skills.length > 0
            ? Array.from(new Set([...prev.skills, ...p.skills]))
            : prev.skills,
        summary: p.summary || prev.summary,
        experience: p.experience || prev.experience,
        education: p.education || prev.education,
      }));
      setFeedback(
        "PDF lido com sucesso! Os campos foram preenchidos automaticamente. Revise e clique em Buscar Vagas."
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
            Envie seu currículo em PDF e o HAF extrai automaticamente seu cargo,
            senioridade, habilidades, e-mail e experiências.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">
          <Upload className="h-4 w-4" />
          {parsingPdf ? "Lendo PDF..." : "Enviar PDF do Currículo"}
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

      {/* Formulário Construtor */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="mb-5 flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-semibold">Construtor de Currículo</h2>
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
              E-mail de contato (e alertas)
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
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Telefone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
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

        {/* Resumo, Experiência e Formação */}
        <div className="mt-5 grid gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Resumo Profissional
            </label>
            <textarea
              rows={3}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Conte brevemente sobre sua trajetória e objetivos..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Experiência Profissional
              </label>
              <textarea
                rows={4}
                value={form.experience}
                onChange={(e) =>
                  setForm({ ...form, experience: e.target.value })
                }
                placeholder="Empresas, cargos e principais entregas..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Formação Acadêmica
              </label>
              <textarea
                rows={4}
                value={form.education}
                onChange={(e) =>
                  setForm({ ...form, education: e.target.value })
                }
                placeholder="Cursos, graduação, certificações..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
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

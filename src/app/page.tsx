"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Briefcase,
  CheckCircle2,
  Database,
  ExternalLink,
  Filter,
  Globe,
  Mail,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import type {
  JobRecord,
  KeywordRecord,
  ScrapeRunRecord,
  SourceRecord,
  SourceType,
} from "@/lib/scrapers/types";

interface DashboardData {
  jobs: JobRecord[];
  sources: SourceRecord[];
  keywords: KeywordRecord[];
  runs: ScrapeRunRecord[];
  settings: {
    alertEmail: string;
    telegramChatId: string;
  };
  integrations: {
    database: boolean;
    telegram: boolean;
    email: boolean;
  };
}

const SOURCE_HELP: Record<
  SourceType,
  { label: string; placeholder: string; hint: string }
> = {
  greenhouse: {
    label: "Greenhouse (ATS)",
    placeholder: "Ex: nubank ou https://boards.greenhouse.io/nubank",
    hint: "Informe o slug da empresa ou a URL do board no Greenhouse.",
  },
  lever: {
    label: "Lever (ATS)",
    placeholder: "Ex: netflix ou https://jobs.lever.co/netflix",
    hint: "Informe o slug da empresa ou a URL no Lever.",
  },
  gupy: {
    label: "Gupy",
    placeholder: "Ex: nubank ou https://nubank.gupy.io",
    hint: "Informe o subdomínio ou URL da página Gupy da empresa.",
  },
  ashby: {
    label: "Ashby (ATS)",
    placeholder: "Ex: vercel ou https://jobs.ashbyhq.com/vercel",
    hint: "Informe o slug da empresa ou a URL no Ashby.",
  },
  workable: {
    label: "Workable (ATS)",
    placeholder: "Ex: company ou https://apply.workable.com/company",
    hint: "Informe o slug da empresa ou a URL no Workable.",
  },
  github_issues: {
    label: "GitHub Vagas (Issues)",
    placeholder: "Ex: frontendbr/vagas ou backend-br/vagas",
    hint: "Repositório GitHub que publica vagas como Issues (owner/repo).",
  },
  rss: {
    label: "Feed RSS / Atom",
    placeholder: "https://site.com/vagas/rss.xml",
    hint: "URL completa de um feed RSS ou Atom de vagas.",
  },
  html: {
    label: "Página HTML (Scraper Genérico)",
    placeholder: "https://empresa.com/carreiras",
    hint: "Extrai vagas via JSON-LD, seletor CSS ou links de vagas.",
  },
  remotive: {
    label: "Remotive (API Global)",
    placeholder: "all",
    hint: "Não precisa de URL; busca vagas remotas na API do Remotive.",
  },
  arbeitnow: {
    label: "Arbeitnow (API Global)",
    placeholder: "all",
    hint: "Não precisa de URL; busca vagas tech/remotas na API do Arbeitnow.",
  },
  remoteok: {
    label: "RemoteOK (API Global)",
    placeholder: "all",
    hint: "Não precisa de URL; busca vagas remotas na API do RemoteOK.",
  },
  jobicy: {
    label: "Jobicy (API Global)",
    placeholder: "all",
    hint: "Não precisa de URL; busca vagas remotas na API do Jobicy.",
  },
  himalayas: {
    label: "Himalayas (API Global)",
    placeholder: "all",
    hint: "Não precisa de URL; busca vagas remotas na API do Himalayas.",
  },
};

const NO_TARGET_TYPES: SourceType[] = [
  "remotive",
  "arbeitnow",
  "remoteok",
  "jobicy",
  "himalayas",
];

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form nova fonte
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("greenhouse");
  const [sourceTarget, setSourceTarget] = useState("");
  const [sourceSelector, setSourceSelector] = useState("");

  // Form nova keyword
  const [newKeyword, setNewKeyword] = useState("");

  // Form configurações de alerta
  const [alertEmail, setAlertEmail] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao carregar dados");
      const parsed = json as DashboardData;
      setData(parsed);
      setAlertEmail(parsed.settings?.alertEmail || "");
      setTelegramChatId(parsed.settings?.telegramChatId || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 6000);
  };

  const handleRunScrape = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao rodar monitor");
      showToast(
        `Concluído! ${json.jobsFound} vagas filtradas, ${json.newJobsCount} nova(s) salva(s).`
      );
      await fetchDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao executar");
    } finally {
      setRunning(false);
    }
  };

  const handleTestNotifications = async () => {
    setTestingAlert(true);
    try {
      const res = await fetch("/api/test-notifications", { method: "POST" });
      const json = await res.json();
      const tg = json.telegram?.sent
        ? "Telegram: OK"
        : `Telegram: ${json.telegram?.reason}`;
      const em = json.email?.sent
        ? "E-mail: OK"
        : `E-mail: ${json.email?.reason}`;
      showToast(`${tg} | ${em}`);
    } catch {
      showToast("Erro ao testar notificações.");
    } finally {
      setTestingAlert(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceName.trim()) return;
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sourceName,
          type: sourceType,
          target: NO_TARGET_TYPES.includes(sourceType) ? "all" : sourceTarget,
          selector: sourceType === "html" ? sourceSelector : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao adicionar fonte");
      setSourceName("");
      setSourceTarget("");
      setSourceSelector("");
      showToast("Fonte adicionada!");
      await fetchDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro");
    }
  };

  const handleToggleSource = async (source: SourceRecord) => {
    await fetch(`/api/sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !source.enabled }),
    });
    await fetchDashboard();
  };

  const handleDeleteSource = async (id: number) => {
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    await fetchDashboard();
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    await fetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: newKeyword }),
    });
    setNewKeyword("");
    await fetchDashboard();
  };

  const handleDeleteKeyword = async (id: number) => {
    await fetch(`/api/keywords/${id}`, { method: "DELETE" });
    await fetchDashboard();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertEmail, telegramChatId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar alertas");
      showToast("Configurações de alerta salvas!");
      await fetchDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredJobs = useMemo(() => {
    if (!data?.jobs) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.jobs;
    return data.jobs.filter((j) =>
      `${j.title} ${j.company} ${j.location || ""} ${j.source_name}`
        .toLowerCase()
        .includes(q)
    );
  }, [data?.jobs, search]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                HAF — Monitor de Vagas
              </h1>
              <p className="text-xs text-slate-400">
                Next.js + Neon Postgres + Vercel Cron + Telegram &amp; Resend
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTestNotifications}
              disabled={testingAlert}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
            >
              <Bell className="h-4 w-4 text-amber-400" />
              {testingAlert ? "Testando..." : "Testar Alertas"}
            </button>

            <button
              onClick={handleRunScrape}
              disabled={running || !data?.integrations.database}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {running ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {running ? "Varrendo fontes..." : "Rodar Monitor Agora"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {toast && (
          <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/70 px-4 py-3 text-sm text-indigo-100">
            {toast}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-4 text-sm text-rose-200">
            <strong>Atenção:</strong> {error}
            <p className="mt-1 text-xs text-rose-300/80">
              Configure a variável <code>DATABASE_URL</code> no seu{" "}
              <code>.env.local</code> (ou conecte o Neon Postgres na Vercel) e
              recarregue a página.
            </p>
          </div>
        )}

        {/* Status das Integrações */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium">Neon / Vercel Postgres</p>
                <p className="text-xs text-slate-400">DATABASE_URL</p>
              </div>
            </div>
            {data?.integrations.database ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-400" />
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-3">
              <Send className="h-5 w-5 text-sky-400" />
              <div>
                <p className="text-sm font-medium">Telegram Bot</p>
                <p className="text-xs text-slate-400">
                  TELEGRAM_BOT_TOKEN &amp; CHAT_ID
                </p>
              </div>
            </div>
            {data?.integrations.telegram ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <XCircle className="h-5 w-5 text-amber-400" />
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-violet-400" />
              <div>
                <p className="text-sm font-medium">E-mail (Resend)</p>
                <p className="text-xs text-slate-400">
                  RESEND_API_KEY &amp; ALERT_EMAIL_TO
                </p>
              </div>
            </div>
            {data?.integrations.email ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <XCircle className="h-5 w-5 text-amber-400" />
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Coluna Esquerda: Alertas, Fontes e Filtros */}
          <div className="space-y-6 lg:col-span-4">
            {/* Destino dos Alertas */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-400" />
                <h2 className="font-semibold">Receber Alertas</h2>
              </div>
              <form onSubmit={handleSaveSettings} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    E-mail para receber vagas
                  </label>
                  <input
                    type="email"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="seu-email@exemplo.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Telegram Chat ID (opcional)
                  </label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="Ex: 123456789"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full rounded-lg bg-amber-600 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
                >
                  {savingSettings ? "Salvando..." : "Salvar Destino dos Alertas"}
                </button>
              </form>
            </section>

            {/* Palavras-chave */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4 text-indigo-400" />
                <h2 className="font-semibold">Filtros (Palavras-chave)</h2>
              </div>
              <p className="mb-3 text-xs text-slate-400">
                Se vazio, salva todas as vagas. Se preenchido, salva apenas vagas
                que contenham ao menos um termo.
              </p>

              <form onSubmit={handleAddKeyword} className="mb-3 flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Ex: React, Python, Pleno..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium hover:bg-slate-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                {data?.keywords.length === 0 && (
                  <span className="text-xs text-slate-500">
                    Nenhum filtro ativo (capturando tudo).
                  </span>
                )}
                {data?.keywords.map((kw) => (
                  <span
                    key={kw.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300"
                  >
                    {kw.term}
                    <button
                      onClick={() => handleDeleteKeyword(kw.id)}
                      className="text-indigo-400 hover:text-rose-400"
                      title="Remover"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </section>

            {/* Adicionar Fonte */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-400" />
                <h2 className="font-semibold">Adicionar Fonte de Vagas</h2>
              </div>

              <form onSubmit={handleAddSource} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Conector
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value as SourceType)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    {Object.entries(SOURCE_HELP).map(([key, info]) => (
                      <option key={key} value={key}>
                        {info.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {SOURCE_HELP[sourceType].hint}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Nome de exibição
                  </label>
                  <input
                    type="text"
                    required
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder="Ex: Nubank Tech"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {!NO_TARGET_TYPES.includes(sourceType) && (
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">
                      URL ou Slug da Empresa
                    </label>
                    <input
                      type="text"
                      required
                      value={sourceTarget}
                      onChange={(e) => setSourceTarget(e.target.value)}
                      placeholder={SOURCE_HELP[sourceType].placeholder}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {sourceType === "html" && (
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">
                      Seletor CSS (opcional)
                    </label>
                    <input
                      type="text"
                      value={sourceSelector}
                      onChange={(e) => setSourceSelector(e.target.value)}
                      placeholder="Ex: .job-card a"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Adicionar Fonte
                </button>
              </form>
            </section>

            {/* Lista de Fontes */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="mb-3 font-semibold">
                Fontes Configuradas ({data?.sources.length ?? 0})
              </h2>
              <div className="space-y-2.5">
                {data?.sources.map((src) => (
                  <div
                    key={src.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {src.name}
                        </span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">
                          {src.type}
                        </span>
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {src.last_status || "Aguardando execução"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleSource(src)}
                        className={`rounded px-2 py-1 text-[11px] font-medium ${
                          src.enabled
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {src.enabled ? "Ativa" : "Pausada"}
                      </button>
                      <button
                        onClick={() => handleDeleteSource(src.id)}
                        className="text-slate-500 hover:text-rose-400"
                        title="Remover fonte"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Coluna Direita: Feed de Vagas */}
          <div className="lg:col-span-8">
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  Vagas Encontradas ({filteredJobs.length})
                </h2>

                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por cargo, empresa..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {loading ? (
                <p className="py-12 text-center text-sm text-slate-400">
                  Carregando vagas...
                </p>
              ) : filteredJobs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 py-14 text-center">
                  <p className="text-sm text-slate-400">
                    Nenhuma vaga encontrada ainda.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Clique em <strong>Rodar Monitor Agora</strong> para buscar
                    vagas nas fontes ativas.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
                            {job.source_name}
                          </span>
                          {job.notified && (
                            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                              Notificada
                            </span>
                          )}
                        </div>
                        <h3 className="truncate font-semibold text-slate-100">
                          {job.title}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {job.company} • {job.location || "Não informado"}
                        </p>
                      </div>

                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                      >
                        Abrir vaga
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

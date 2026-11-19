"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  Briefcase,
  CheckCircle2,
  Database,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  LogOut,
  Mail,
  MapPin,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Trash2,
  XCircle,
} from "lucide-react";
import AuthGate from "@/components/AuthGate";
import ResumeBuilder, { type DbResumeRow } from "@/components/ResumeBuilder";
import {
  BRAZIL_STATES,
  matchesLocationFilter,
  type LocationFilter,
} from "@/lib/brazilLocations";
import type {
  JobRecord,
  KeywordRecord,
  ScrapeRunRecord,
  SourceRecord,
  SourceType,
} from "@/lib/scrapers/types";

interface DashboardData {
  user: { id: number; name: string; email: string };
  jobs: JobRecord[];
  sources: SourceRecord[];
  keywords: KeywordRecord[];
  runs: ScrapeRunRecord[];
  settings: {
    alertEmail: string;
    telegramChatId: string;
  };
  locationFilter: LocationFilter;
  resume: DbResumeRow | null;
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
  themuse: {
    label: "The Muse (API Global)",
    placeholder: "all",
    hint: "Não precisa de URL; busca vagas na API oficial do The Muse.",
  },
  workingnomads: {
    label: "Working Nomads (API Global)",
    placeholder: "all",
    hint: "Não precisa de URL; busca vagas remotas no Working Nomads.",
  },
};

const NO_TARGET_TYPES: SourceType[] = [
  "remotive",
  "arbeitnow",
  "remoteok",
  "jobicy",
  "himalayas",
  "themuse",
  "workingnomads",
];

type TabKey = "jobs" | "resume" | "settings";

export default function HomePage() {
  const [authState, setAuthState] = useState<
    "checking" | "unauthenticated" | "authenticated"
  >("checking");
  const [activeTab, setActiveTab] = useState<TabKey>("jobs");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [jobStatusFilter, setJobStatusFilter] = useState<
    "all" | "saved" | "applied" | "pending"
  >("all");

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

  // Filtro por Estado e até 5 Cidades
  const [filterState, setFilterState] = useState("");
  const [filterCities, setFilterCities] = useState<string[]>([]);
  const [includeRemote, setIncludeRemote] = useState(true);
  const [cityInput, setCityInput] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 6500);
  };

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.status === 401) {
        setAuthState("unauthenticated");
        setData(null);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao carregar dados");
      const parsed = json as DashboardData;
      setData(parsed);
      setAlertEmail(parsed.settings?.alertEmail || "");
      setTelegramChatId(parsed.settings?.telegramChatId || "");
      setFilterState(parsed.locationFilter?.state || "");
      setFilterCities(parsed.locationFilter?.cities || []);
      setIncludeRemote(parsed.locationFilter?.includeRemote ?? true);
      setAuthState("authenticated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setAuthState("authenticated");
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setData(null);
    setAuthState("unauthenticated");
  };

  const handleRunScrape = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao rodar monitor");
      showToast(
        `Varredura em ${json.sourcesChecked} fontes concluída! ${json.jobsFound} vagas compatíveis, ${json.newJobsCount} nova(s).`
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
      showToast("Destino dos alertas salvo!");
      await fetchDashboard();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveLocationFilter = async (
    nextState = filterState,
    nextCities = filterCities,
    nextRemote = includeRemote
  ) => {
    setSavingLocation(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filterState: nextState,
          filterCities: nextCities,
          includeRemote: nextRemote,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar filtro de localização");
      showToast("Filtro de estado e cidades salvo no monitor!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar filtro");
    } finally {
      setSavingLocation(false);
    }
  };

  const handleAddCity = (cityName: string) => {
    const clean = cityName.trim();
    if (!clean) return;
    if (filterCities.length >= 5) {
      showToast("Você pode selecionar no máximo 5 cidades.");
      return;
    }
    if (filterCities.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setCityInput("");
      return;
    }
    setFilterCities((prev) => [...prev, clean]);
    setCityInput("");
  };

  const handleRemoveCity = (cityName: string) => {
    setFilterCities((prev) => prev.filter((c) => c !== cityName));
  };

  const handleToggleJobFlag = async (
    jobId: number,
    patch: { saved?: boolean; applied?: boolean }
  ) => {
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await fetchDashboard();
  };

  const handleDeleteJob = async (jobId: number) => {
    await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    await fetchDashboard();
  };

  const selectedStateObj = useMemo(
    () => BRAZIL_STATES.find((s) => s.uf === filterState) || null,
    [filterState]
  );

  const resumeTerms = useMemo(() => {
    const terms: string[] = [];
    if (data?.resume?.skills && Array.isArray(data.resume.skills)) {
      terms.push(...data.resume.skills.map((s) => s.toLowerCase()));
    }
    if (data?.resume?.target_role) {
      terms.push(
        ...data.resume.target_role
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length >= 3)
      );
    }
    return Array.from(new Set(terms));
  }, [data?.resume]);

  const filteredJobs = useMemo(() => {
    if (!data?.jobs) return [];
    const q = search.trim().toLowerCase();
    const locFilter: LocationFilter = {
      state: filterState,
      cities: filterCities,
      includeRemote,
    };

    const list = data.jobs.filter((j) => {
      const matchesSearch =
        !q ||
        `${j.title} ${j.company} ${j.location || ""} ${j.source_name}`
          .toLowerCase()
          .includes(q);
      const matchesLoc = matchesLocationFilter(
        `${j.title} ${j.location || ""}`,
        locFilter
      );
      const matchesStatus =
        jobStatusFilter === "all"
          ? true
          : jobStatusFilter === "saved"
            ? Boolean(j.saved)
            : jobStatusFilter === "applied"
              ? Boolean(j.applied)
              : !j.applied;
      return matchesSearch && matchesLoc && matchesStatus;
    });

    if (resumeTerms.length === 0) return list;

    return [...list].sort((a, b) => {
      const hayA = `${a.title} ${a.company} ${a.location || ""}`.toLowerCase();
      const hayB = `${b.title} ${b.company} ${b.location || ""}`.toLowerCase();
      const scoreA = resumeTerms.filter((t) => hayA.includes(t)).length;
      const scoreB = resumeTerms.filter((t) => hayB.includes(t)).length;
      return scoreB - scoreA;
    });
  }, [data?.jobs, search, filterState, filterCities, includeRemote, jobStatusFilter, resumeTerms]);

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Verificando sessão...
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <AuthGate onAuthenticated={fetchDashboard} />;
  }

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
                Olá, {data?.user?.name || "Usuário"} • Busca unificada em todas
                as fontes
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleTestNotifications}
              disabled={testingAlert}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
            >
              <Bell className="h-4 w-4 text-amber-400" />
              {testingAlert ? "Testando..." : "Testar Alertas"}
            </button>

            <button
              onClick={handleRunScrape}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {running ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {running
                ? "Varrendo todas as fontes..."
                : "Buscar em Todas as Fontes"}
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-400 transition hover:text-rose-300"
              title="Sair da conta"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>

        {/* Navegação em Abas */}
        <div className="mx-auto flex max-w-7xl gap-2 px-6 pb-3">
          <button
            onClick={() => setActiveTab("jobs")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              activeTab === "jobs"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            Vagas ({data?.jobs.length ?? 0})
          </button>

          <button
            onClick={() => setActiveTab("resume")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              activeTab === "resume"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <FileText className="h-4 w-4" />
            Meu Currículo (PDF / Construtor)
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              activeTab === "settings"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Settings className="h-4 w-4" />
            Alertas, Filtros &amp; Fontes ({data?.sources.length ?? 0})
          </button>
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
          </div>
        )}

        {/* ABA 1: VAGAS */}
        {activeTab === "jobs" && (
          <div className="space-y-6">
            {/* Métricas rápidas */}
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs text-slate-400">Vagas capturadas</p>
                <p className="mt-1 text-2xl font-bold text-slate-100">
                  {data?.jobs.length ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs text-slate-400">Favoritas</p>
                <p className="mt-1 text-2xl font-bold text-amber-400">
                  {data?.jobs.filter((j) => j.saved).length ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs text-slate-400">Candidaturas</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">
                  {data?.jobs.filter((j) => j.applied).length ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs text-slate-400">Fontes ativas</p>
                <p className="mt-1 text-2xl font-bold text-indigo-400">
                  {data?.sources.filter((s) => s.enabled).length ?? 0}
                </p>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    Vagas Encontradas ({filteredJobs.length})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Ordenadas por compatibilidade com o seu currículo.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      ["all", "Todas"],
                      ["saved", "Favoritas"],
                      ["applied", "Candidatadas"],
                      ["pending", "Não candidatadas"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setJobStatusFilter(key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        jobStatusFilter === key
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrar por cargo, empresa ou fonte..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Filtro por Estado e até 5 Cidades */}
            <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span>Filtrar por Estado e Cidades (até 5)</span>
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                    {filterCities.length}/5 cidades
                  </span>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={includeRemote}
                    onChange={(e) => setIncludeRemote(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 accent-indigo-600"
                  />
                  Incluir vagas remotas
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <select
                    value={filterState}
                    onChange={(e) => setFilterState(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">Todos os estados (Brasil / Global)</option>
                    {BRAZIL_STATES.map((st) => (
                      <option key={st.uf} value={st.uf}>
                        {st.name} ({st.uf})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 sm:col-span-5">
                  <input
                    type="text"
                    list="brazil-cities-list"
                    value={cityInput}
                    disabled={filterCities.length >= 5}
                    onChange={(e) => setCityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCity(cityInput);
                      }
                    }}
                    placeholder={
                      filterCities.length >= 5
                        ? "Limite de 5 cidades atingido"
                        : "Digite ou escolha uma cidade..."
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                  <datalist id="brazil-cities-list">
                    {(selectedStateObj
                      ? selectedStateObj.cities
                      : BRAZIL_STATES.flatMap((s) => s.cities)
                    ).map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    disabled={filterCities.length >= 5 || !cityInput.trim()}
                    onClick={() => handleAddCity(cityInput)}
                    className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                  >
                    Adicionar
                  </button>
                </div>

                <div className="flex gap-2 sm:col-span-3">
                  <button
                    type="button"
                    disabled={savingLocation}
                    onClick={() => handleSaveLocationFilter()}
                    className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {savingLocation ? "Salvando..." : "Salvar no Monitor"}
                  </button>
                  {(filterState || filterCities.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterState("");
                        setFilterCities([]);
                        handleSaveLocationFilter("", [], includeRemote);
                      }}
                      className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-2 text-xs text-slate-400 hover:text-rose-300"
                      title="Limpar filtro"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {filterCities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {filterCities.map((city) => (
                    <span
                      key={city}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
                    >
                      {city}
                      <button
                        type="button"
                        onClick={() => handleRemoveCity(city)}
                        className="text-emerald-400 hover:text-rose-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {filteredJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 py-14 text-center">
                <p className="text-sm text-slate-300">
                  Nenhuma vaga encontrada ainda.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Preencha seu currículo na aba{" "}
                  <button
                    onClick={() => setActiveTab("resume")}
                    className="text-indigo-400 underline"
                  >
                    Meu Currículo
                  </button>{" "}
                  ou clique em <strong>Buscar em Todas as Fontes</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map((job) => {
                  const hay = `${job.title} ${job.company} ${job.location || ""}`.toLowerCase();
                  const matchedCount = resumeTerms.filter((t) =>
                    hay.includes(t)
                  ).length;

                  return (
                    <div
                      key={job.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
                            {job.source_name}
                          </span>
                          {matchedCount > 0 && (
                            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                              {matchedCount} match(es) com seu currículo
                            </span>
                          )}
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

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleJobFlag(job.id, { saved: !job.saved })
                          }
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                            job.saved
                              ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                              : "border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200"
                          }`}
                          title="Favoritar vaga"
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleJobFlag(job.id, {
                              applied: !job.applied,
                            })
                          }
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                            job.applied
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                              : "border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200"
                          }`}
                          title="Marcar como candidatada"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {job.applied ? "Candidatado" : "Candidatar"}
                        </button>

                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                        >
                          Abrir vaga
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDeleteJob(job.id)}
                          className="rounded-lg border border-slate-800 p-2 text-slate-500 transition hover:text-rose-400"
                          title="Remover vaga"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          </div>
        )}

        {/* ABA 2: MEU CURRÍCULO */}
        {activeTab === "resume" && (
          <ResumeBuilder
            initialResume={data?.resume || null}
            onSaved={async (msg, goToJobs) => {
              showToast(msg);
              await fetchDashboard();
              if (goToJobs) setActiveTab("jobs");
            }}
          />
        )}

        {/* ABA 3: ALERTAS, FILTROS & FONTES */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Status das Integrações */}
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium">Neon Postgres</p>
                    <p className="text-xs text-slate-400">Banco conectado</p>
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
                    <p className="text-xs text-slate-400">Chat ID pessoal</p>
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
                    <p className="text-xs text-slate-400">Alertas por e-mail</p>
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
              <div className="space-y-6 lg:col-span-5">
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
                      {savingSettings
                        ? "Salvando..."
                        : "Salvar Destino dos Alertas"}
                    </button>
                  </form>
                </section>

                {/* Palavras-chave */}
                <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-indigo-400" />
                    <h2 className="font-semibold">
                      Palavras-chave (Sincronizadas com Currículo)
                    </h2>
                  </div>
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
              </div>

              {/* Fontes */}
              <div className="space-y-6 lg:col-span-7">
                <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-emerald-400" />
                    <h2 className="font-semibold">Adicionar Fonte Extra</h2>
                  </div>

                  <form onSubmit={handleAddSource} className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">
                        Conector
                      </label>
                      <select
                        value={sourceType}
                        onChange={(e) =>
                          setSourceType(e.target.value as SourceType)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      >
                        {Object.entries(SOURCE_HELP).map(([key, info]) => (
                          <option key={key} value={key}>
                            {info.label}
                          </option>
                        ))}
                      </select>
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
                      <div className="sm:col-span-2">
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
                      <div className="sm:col-span-2">
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

                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                      >
                        Adicionar Fonte
                      </button>
                    </div>
                  </form>
                </section>

                <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold">
                      Fontes Varridas Simultaneamente ({data?.sources.length ?? 0})
                    </h2>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch("/api/sources/sync-defaults", {
                          method: "POST",
                        });
                        const json = await res.json();
                        if (res.ok) {
                          showToast(
                            json.added > 0
                              ? `${json.added} novas fontes confiáveis adicionadas!`
                              : "Todas as fontes padrão já estão cadastradas."
                          );
                          await fetchDashboard();
                        }
                      }}
                      className="rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/25"
                    >
                      + Carregar Fontes Confiáveis (34)
                    </button>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
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
                          </div>
                          <p className="truncate text-[11px] text-slate-500">
                            {src.type} • {src.last_status || "Pronta"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

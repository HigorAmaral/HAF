"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  Briefcase,
  CheckCircle2,
  Clock,
  Database,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import AuthGate from "@/components/AuthGate";
import ResumeBuilder, { type DbResumeRow } from "@/components/ResumeBuilder";
import ThemeToggle from "@/components/ThemeToggle";
import {
  BRAZIL_STATES,
  matchesLocationFilter,
  type LocationFilter,
  type WorkModeFilter,
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

type TabKey = "jobs" | "applications" | "resume" | "settings";
type SeniorityFilter = "all" | "estagio" | "junior" | "pleno" | "senior";

const APPLICATION_STAGES: Array<{ value: string; label: string }> = [
  { value: "", label: "Etapa: Não iniciada" },
  { value: "salva", label: "Interesse / Salva" },
  { value: "enviado", label: "Currículo Enviado" },
  { value: "teste", label: "Teste / Desafio Técnico" },
  { value: "entrevista", label: "Entrevista RH / Técnica" },
  { value: "proposta", label: "Proposta / Aprovado" },
  { value: "encerrada", label: "Encerrada / Sem retorno" },
];

function detectJobBadges(jobText: string): {
  mode: string;
  seniority: string | null;
} {
  const norm = jobText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  let mode = "Presencial / Local";
  if (/\b(remoto|remote|home office|anywhere)\b/.test(norm)) {
    mode = "100% Remoto";
  } else if (/\b(hibrido|hybrid)\b/.test(norm)) {
    mode = "Híbrido";
  }

  let seniority: string | null = null;
  if (/\b(estagio|estagiario|intern|trainee)\b/.test(norm)) {
    seniority = "Estágio / Trainee";
  } else if (/\b(junior|jr)\b/.test(norm)) {
    seniority = "Júnior";
  } else if (/\b(pleno|mid)\b/.test(norm)) {
    seniority = "Pleno";
  } else if (/\b(senior|sr|lead|especialista|staff)\b/.test(norm)) {
    seniority = "Sênior";
  }

  return { mode, seniority };
}

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [jobStatusFilter, setJobStatusFilter] = useState<
    "all" | "saved" | "applied" | "pending"
  >("all");
  const [seniorityFilter, setSeniorityFilter] = useState<SeniorityFilter>("all");
  const [sortBy, setSortBy] = useState<"match" | "recent">("match");
  const [pitchJob, setPitchJob] = useState<JobRecord | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

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

  // Filtro por Estado, até 5 Cidades e Modelo de Trabalho
  const [filterState, setFilterState] = useState("");
  const [filterCities, setFilterCities] = useState<string[]>([]);
  const [includeRemote, setIncludeRemote] = useState(true);
  const [workMode, setWorkMode] = useState<WorkModeFilter>("all");
  const [onlyBrazil, setOnlyBrazil] = useState(true);
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
      setWorkMode(parsed.locationFilter?.workMode || "all");
      setOnlyBrazil(parsed.locationFilter?.onlyBrazil ?? true);
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
    nextRemote = includeRemote,
    nextWorkMode = workMode,
    nextOnlyBrazil = onlyBrazil
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
          workMode: nextWorkMode,
          onlyBrazil: nextOnlyBrazil,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar filtro de localização");
      showToast("Filtro de localização e modelo salvo no monitor!");
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
    patch: {
      saved?: boolean;
      applied?: boolean;
      application_stage?: string;
      notes?: string;
    }
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

  const handleClearNonFavorites = async () => {
    await fetch("/api/jobs/clear", { method: "DELETE" });
    showToast("Vagas não favoritas/não candidatadas removidas.");
    await fetchDashboard();
  };

  const handleExportCsv = () => {
    if (filteredJobs.length === 0) return;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [
      ["Título", "Empresa", "Local", "Fonte", "Favorita", "Candidatada", "URL"],
      ...filteredJobs.map((j) => [
        esc(j.title),
        esc(j.company),
        esc(j.location || "Não informado"),
        esc(j.source_name),
        j.saved ? "Sim" : "Não",
        j.applied ? "Sim" : "Não",
        esc(j.url),
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vagas-haf.csv";
    a.click();
    URL.revokeObjectURL(url);
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
      workMode,
      onlyBrazil,
    };

    const list = data.jobs.filter((j) => {
      const matchesSearch =
        !q ||
        `${j.title} ${j.company} ${j.location || ""} ${j.source_name}`
          .toLowerCase()
          .includes(q);
      const matchesLoc = matchesLocationFilter(
        `${j.title} ${j.location || ""}`,
        locFilter,
        j.source_name
      );
      const matchesStatus =
        jobStatusFilter === "all"
          ? true
          : jobStatusFilter === "saved"
            ? Boolean(j.saved)
            : jobStatusFilter === "applied"
              ? Boolean(j.applied)
              : !j.applied;

      const normTitle = `${j.title} ${j.location || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const matchesSeniority =
        seniorityFilter === "all"
          ? true
          : seniorityFilter === "estagio"
            ? /\b(estagio|estagiario|intern|trainee)\b/.test(normTitle)
            : seniorityFilter === "junior"
              ? /\b(junior|jr)\b/.test(normTitle)
              : seniorityFilter === "pleno"
                ? /\b(pleno|mid)\b/.test(normTitle)
                : /\b(senior|sr|lead|especialista|staff)\b/.test(normTitle);

      return matchesSearch && matchesLoc && matchesStatus && matchesSeniority;
    });

    if (sortBy === "recent" || resumeTerms.length === 0) return list;

    return [...list].sort((a, b) => {
      const hayA = `${a.title} ${a.company} ${a.location || ""}`.toLowerCase();
      const hayB = `${b.title} ${b.company} ${b.location || ""}`.toLowerCase();
      const scoreA = resumeTerms.filter((t) => hayA.includes(t)).length;
      const scoreB = resumeTerms.filter((t) => hayB.includes(t)).length;
      return scoreB - scoreA;
    });
  }, [data?.jobs, search, filterState, filterCities, includeRemote, workMode, onlyBrazil, jobStatusFilter, seniorityFilter, sortBy, resumeTerms]);

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
    <div className="min-h-screen">
      {/* Barra superior compacta exclusiva para Mobile/Tablet (< lg) */}
      <header className="gupy-header sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="gupy-btn-primary flex h-9 w-9 items-center justify-center rounded-xl">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">HAF</h1>
            <p className="text-[11px] text-slate-400">
              {data?.user?.name || "Monitor de Vagas"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunScrape}
            disabled={running}
            className="gupy-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {running ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span>{running ? "Varrendo..." : "Buscar"}</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="gupy-btn-secondary inline-flex items-center justify-center p-2"
            aria-label="Abrir menu lateral"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* Overlay Mobile quando o menu direito está aberto */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Barra de Navegação Fixa no Lado Esquerdo */}
      <aside
        className={`gupy-sidebar fixed top-0 left-0 bottom-0 z-40 flex w-72 flex-col justify-between p-5 transition-transform duration-200 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="space-y-6 overflow-y-auto">
          {/* Logo e Usuário */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="gupy-btn-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold tracking-tight">
                  HAF — Vagas
                </h1>
                <p className="truncate text-xs text-slate-400">
                  Olá, {data?.user?.name || "Usuário"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="gupy-btn-secondary p-1.5 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Ação Principal de Varredura */}
          <div className="space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleRunScrape();
              }}
              disabled={running}
              className="gupy-btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-xs shadow-xs disabled:opacity-50"
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
              onClick={() => {
                setMobileMenuOpen(false);
                handleTestNotifications();
              }}
              disabled={testingAlert}
              className="gupy-btn-secondary flex w-full items-center justify-center gap-2 py-2 text-xs disabled:opacity-50"
            >
              <Bell className="h-4 w-4" />
              {testingAlert ? "Testando..." : "Testar Alertas"}
            </button>
          </div>

          {/* Menu de Navegação Vertical */}
          <nav className="space-y-1.5">
            <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Navegação
            </p>

            <button
              onClick={() => {
                setActiveTab("jobs");
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                activeTab === "jobs"
                  ? "gupy-btn-primary"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Briefcase className="h-4 w-4" />
                <span>Buscar Vagas</span>
              </span>
              <span className="gupy-badge px-2 py-0.5 text-xs">
                {data?.jobs.length ?? 0}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("applications");
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                activeTab === "applications"
                  ? "gupy-btn-primary"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Minhas Candidaturas</span>
              </span>
              <span className="gupy-badge px-2 py-0.5 text-xs">
                {data?.jobs.filter((j) => j.applied || j.saved || j.application_stage).length ?? 0}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("resume");
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                activeTab === "resume"
                  ? "gupy-btn-primary"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <FileText className="h-4 w-4" />
                <span>Meu Currículo</span>
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab("settings");
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                activeTab === "settings"
                  ? "gupy-btn-primary"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Settings className="h-4 w-4" />
                <span>Alertas &amp; Fontes</span>
              </span>
              <span className="gupy-badge px-2 py-0.5 text-xs">
                {data?.sources.length ?? 0}
              </span>
            </button>
          </nav>
        </div>

        {/* Rodapé da Barra Direita: Tema Dark/Light e Sair */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-800 pt-4">
          <ThemeToggle />

          <button
            onClick={handleLogout}
            className="gupy-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
            title="Sair da conta"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal com margem esquerda para a barra fixa no desktop */}
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:ml-72 lg:px-8 lg:py-8">
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
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-5 shadow-lg shadow-black/20 backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Vagas capturadas
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
                  {data?.jobs.length ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-slate-900/55 p-5 shadow-lg shadow-black/20 backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-wider text-amber-300/80">
                  Favoritas
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-amber-400">
                  {data?.jobs.filter((j) => j.saved).length ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/55 p-5 shadow-lg shadow-black/20 backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-300/80">
                  Candidaturas
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-400">
                  {data?.jobs.filter((j) => j.applied).length ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/55 p-5 shadow-lg shadow-black/20 backdrop-blur">
                <p className="text-xs font-medium uppercase tracking-wider text-indigo-300/80">
                  Fontes ativas
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-indigo-400">
                  {data?.sources.filter((s) => s.enabled).length ?? 0}
                </p>
              </div>
            </div>

            <section className="rounded-2xl border border-white/10 bg-slate-900/55 p-6 shadow-xl shadow-black/30 backdrop-blur">
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

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={seniorityFilter}
                    onChange={(e) =>
                      setSeniorityFilter(e.target.value as SeniorityFilter)
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="all">Nível: Todos</option>
                    <option value="estagio">Estágio / Trainee</option>
                    <option value="junior">Júnior</option>
                    <option value="pleno">Pleno</option>
                    <option value="senior">Sênior / Especialista</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as "match" | "recent")
                    }
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="match">Ordenar: Maior Match</option>
                    <option value="recent">Ordenar: Mais Recentes</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={filteredJobs.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar CSV
                  </button>

                  <button
                    type="button"
                    onClick={handleClearNonFavorites}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-400 transition hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Limpar não favoritas
                  </button>
                </div>
              </div>

            {/* Filtro por Estado e até 5 Cidades */}
            <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span>Filtrar por Modelo, Estado e Cidades (até 5)</span>
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                    {filterCities.length}/5 cidades
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      ["all", "Todos"],
                      ["remote", "Remoto"],
                      ["hybrid", "Híbrido"],
                      ["onsite", "Presencial"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setWorkMode(mode)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                        workMode === mode
                          ? "bg-emerald-600 text-white"
                          : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}

                  <label className="ml-2 inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={onlyBrazil}
                      onChange={(e) => setOnlyBrazil(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 accent-emerald-600"
                    />
                    Apenas Brasil
                  </label>

                  <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={includeRemote}
                      onChange={(e) => setIncludeRemote(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 accent-indigo-600"
                    />
                    Incluir remotas
                  </label>
                </div>
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
                  const matchedTerms = resumeTerms.filter((t) =>
                    hay.includes(t)
                  );
                  const matchedCount = matchedTerms.length;
                  const badges = detectJobBadges(
                    `${job.title} ${job.location || ""}`
                  );

                  return (
                    <div
                      key={job.id}
                      className="gupy-job-card flex flex-col justify-between gap-3 p-4.5 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="gupy-badge px-2.5 py-0.5 text-[11px]">
                            {job.source_name}
                          </span>
                          <span className="gupy-badge px-2.5 py-0.5 text-[11px]">
                            {badges.mode}
                          </span>
                          {badges.seniority && (
                            <span className="gupy-badge px-2.5 py-0.5 text-[11px]">
                              {badges.seniority}
                            </span>
                          )}
                          {matchedCount > 0 && (
                            <span className="gupy-btn-primary px-2.5 py-0.5 text-[11px]">
                              {matchedCount} match(es)
                            </span>
                          )}
                        </div>

                        <h3 className="truncate text-base font-semibold text-slate-100">
                          {job.title}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {job.company} • {job.location || "Não informado"}
                        </p>

                        {matchedTerms.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[11px] text-slate-500">
                              Compatível com seu currículo:
                            </span>
                            {matchedTerms.slice(0, 6).map((term) => (
                              <span
                                key={term}
                                className="gupy-badge px-2 py-0.5 text-[10px]"
                              >
                                ✓ {term}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <select
                          value={job.application_stage || (job.applied ? "enviado" : "")}
                          onChange={(e) => {
                            const stage = e.target.value;
                            handleToggleJobFlag(job.id, {
                              application_stage: stage,
                              applied: Boolean(
                                stage && stage !== "salva"
                              ),
                              saved: stage === "salva" ? true : job.saved,
                            });
                          }}
                          className="px-2.5 py-2 text-xs"
                          title="Etapa da candidatura"
                        >
                          {APPLICATION_STAGES.map((st) => (
                            <option key={st.value} value={st.value}>
                              {st.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => setPitchJob(job)}
                          className="gupy-btn-secondary inline-flex items-center gap-1 px-2.5 py-2 text-xs"
                          title="Gerar carta de apresentação para esta vaga"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Carta</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleJobFlag(job.id, { saved: !job.saved })
                          }
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                            job.saved
                              ? "gupy-btn-primary"
                              : "gupy-btn-secondary"
                          }`}
                          title="Favoritar vaga"
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                        </button>

                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gupy-btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
                        >
                          Abrir vaga
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDeleteJob(job.id)}
                          className="gupy-btn-secondary p-2"
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

        {/* ABA: MINHAS CANDIDATURAS (Funil estilo Gupy) */}
        {activeTab === "applications" && (
          <section className="gupy-card p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">
                Minhas Candidaturas &amp; Vagas Salvas
              </h2>
              <p className="text-xs text-slate-400">
                Acompanhe a etapa de cada processo seletivo (Currículo Enviado,
                Teste, Entrevista, Proposta) e registre anotações pessoais.
              </p>
            </div>

            {data?.jobs.filter(
              (j) => j.applied || j.saved || j.application_stage
            ).length === 0 ? (
              <div className="gupy-subcard py-14 text-center">
                <p className="text-sm text-slate-300">
                  Você ainda não salvou ou iniciou nenhuma candidatura.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Na aba <strong>Buscar Vagas</strong>, selecione uma etapa ou
                  favorite uma vaga para acompanhá-la aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.jobs
                  .filter((j) => j.applied || j.saved || j.application_stage)
                  .map((job) => (
                    <div
                      key={job.id}
                      className="gupy-job-card space-y-3 p-4.5"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="gupy-badge px-2.5 py-0.5 text-[11px]">
                              {job.source_name}
                            </span>
                            <span className="gupy-btn-primary px-2.5 py-0.5 text-[11px]">
                              {APPLICATION_STAGES.find(
                                (s) =>
                                  s.value ===
                                  (job.application_stage ||
                                    (job.applied ? "enviado" : "salva"))
                              )?.label || "Salva"}
                            </span>
                          </div>
                          <h3 className="truncate font-semibold">
                            {job.title}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {job.company} • {job.location || "Não informado"}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={
                              job.application_stage ||
                              (job.applied ? "enviado" : "salva")
                            }
                            onChange={(e) => {
                              const stage = e.target.value;
                              handleToggleJobFlag(job.id, {
                                application_stage: stage,
                                applied: Boolean(stage && stage !== "salva"),
                              });
                            }}
                            className="px-2.5 py-2 text-xs"
                          >
                            {APPLICATION_STAGES.map((st) => (
                              <option key={st.value} value={st.value}>
                                {st.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteId(
                                editingNoteId === job.id ? null : job.id
                              );
                              setNoteDraft(job.notes || "");
                            }}
                            className="gupy-btn-secondary px-3 py-2 text-xs"
                          >
                            {job.notes ? "Editar Anotação" : "+ Anotação"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setPitchJob(job)}
                            className="gupy-btn-secondary px-3 py-2 text-xs"
                          >
                            Carta
                          </button>

                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gupy-btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
                          >
                            Abrir
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>

                      {job.notes && editingNoteId !== job.id && (
                        <div className="gupy-subcard p-3 text-xs">
                          <strong>Suas anotações:</strong> {job.notes}
                        </div>
                      )}

                      {editingNoteId === job.id && (
                        <div className="gupy-subcard space-y-2 p-3">
                          <textarea
                            rows={2}
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Ex: Entrevista marcada para quinta às 14h, salário R$ X, link do teste..."
                            className="w-full px-3 py-2 text-xs"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingNoteId(null)}
                              className="gupy-btn-secondary px-3 py-1.5 text-xs"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await handleToggleJobFlag(job.id, {
                                  notes: noteDraft,
                                });
                                setEditingNoteId(null);
                                showToast("Anotação salva!");
                              }}
                              className="gupy-btn-primary px-3 py-1.5 text-xs"
                            >
                              Salvar Anotação
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </section>
        )}

        {/* Modal de Carta de Apresentação / Pitch */}
        {pitchJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="gupy-card w-full max-w-lg space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold">
                  Carta de Apresentação para {pitchJob.company}
                </h3>
                <button
                  type="button"
                  onClick={() => setPitchJob(null)}
                  className="gupy-btn-secondary p-1.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Gerada automaticamente cruzando seu currículo com a vaga{" "}
                <strong>{pitchJob.title}</strong>.
              </p>

              <textarea
                readOnly
                rows={8}
                value={`Olá, equipe de recrutamento da ${pitchJob.company}!\n\nEstou me candidatando à vaga de ${pitchJob.title}. Meu nome é ${data?.resume?.full_name || data?.user?.name || "Candidato(a)"}${data?.resume?.target_role ? `, atuo na área de ${data.resume.target_role}` : ""} e tenho experiência prática com ${data?.resume?.skills && data.resume.skills.length > 0 ? data.resume.skills.slice(0, 6).join(", ") : "desenvolvimento e tecnologia"}.\n\n${data?.resume?.summary ? `${data.resume.summary}\n\n` : ""}Estou à disposição para conversar e contribuir com os desafios da equipe.${data?.resume?.linkedin_url ? `\nLinkedIn: ${data.resume.linkedin_url}` : ""}${data?.resume?.portfolio_url ? `\nPortfólio/GitHub: ${data.resume.portfolio_url}` : ""}\nContato: ${data?.resume?.email || data?.user?.email || ""}${data?.resume?.phone ? ` | ${data.resume.phone}` : ""}`}
                className="w-full p-3 text-xs leading-relaxed"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPitchJob(null)}
                  className="gupy-btn-secondary px-4 py-2 text-xs"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    const modal = (e.currentTarget as HTMLElement).closest(
                      ".gupy-card"
                    );
                    const ta = modal?.querySelector("textarea");
                    if (ta) {
                      navigator.clipboard.writeText(ta.value);
                      showToast("Carta copiada para a área de transferência!");
                    }
                  }}
                  className="gupy-btn-primary px-4 py-2 text-xs"
                >
                  Copiar Texto
                </button>
              </div>
            </div>
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
            {/* Status das Integrações (sem Neon Postgres) */}
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="gupy-card flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Send className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">Telegram Bot</p>
                    <p className="text-xs text-slate-400">Chat ID pessoal</p>
                  </div>
                </div>
                {data?.integrations.telegram ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </div>

              <div className="gupy-card flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">E-mail (Resend)</p>
                    <p className="text-xs text-slate-400">Alertas por e-mail</p>
                  </div>
                </div>
                {data?.integrations.email ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
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

            {/* Histórico de Varreduras */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                <h2 className="font-semibold">
                  Histórico de Varreduras ({data?.runs.length ?? 0})
                </h2>
              </div>

              {(!data?.runs || data.runs.length === 0) ? (
                <p className="text-xs text-slate-500">
                  Nenhuma varredura executada ainda.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.runs.map((run) => (
                    <div
                      key={run.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-200">
                          {new Date(run.started_at).toLocaleString("pt-BR")}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${
                            run.status === "success"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : run.status === "partial"
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-400">
                        {run.jobs_found} compatíveis • {run.new_jobs} nova(s)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

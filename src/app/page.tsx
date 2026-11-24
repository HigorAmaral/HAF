"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
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
  SlidersHorizontal,
  Sparkles,
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
import { DEFAULT_SOURCES } from "@/lib/defaultSources";
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

interface SavedSearchItem {
  id: string;
  label: string;
  search: string;
  whereQuery: string;
  workMode: WorkModeFilter;
  seniorityFilter: SeniorityFilter;
  contractFilter: ContractFilter;
  dateFilter: DateFilter;
  onlyBrazil: boolean;
}

const SAVED_SEARCHES_KEY = "haf_saved_searches_v1";

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
  smartrecruiters: {
    label: "SmartRecruiters (ATS)",
    placeholder: "Ex: Visa ou https://jobs.smartrecruiters.com/Visa",
    hint: "Informe o identificador da empresa no SmartRecruiters.",
  },
  recruitee: {
    label: "Recruitee (ATS)",
    placeholder: "Ex: empresa ou https://empresa.recruitee.com",
    hint: "Informe o subdomínio ou URL no Recruitee.",
  },
  breezy: {
    label: "Breezy HR (ATS)",
    placeholder: "Ex: empresa ou https://empresa.breezy.hr",
    hint: "Informe o subdomínio ou URL no Breezy HR.",
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
type ContractFilter = "all" | "clt" | "pj" | "estagio";
type DateFilter = "all" | "24h" | "3d" | "7d" | "14d" | "30d";
type MatchFilter = "all" | "any" | "strong";
type SortOption = "match" | "recent" | "company";

const APPLICATION_STAGES: Array<{ value: string; label: string }> = [
  { value: "", label: "Etapa: Não iniciada" },
  { value: "salva", label: "Interesse / Salva" },
  { value: "enviado", label: "Currículo Enviado" },
  { value: "teste", label: "Teste / Desafio Técnico" },
  { value: "entrevista", label: "Entrevista RH / Técnica" },
  { value: "proposta", label: "Proposta / Aprovado" },
  { value: "encerrada", label: "Encerrada / Sem retorno" },
];

function normalizeForMatch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function detectJobBadges(jobText: string): {
  mode: string;
  seniority: string | null;
  contract: string | null;
} {
  const norm = normalizeForMatch(jobText);

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

  let contract: string | null = null;
  if (/\bclt\b/.test(norm)) {
    contract = "CLT";
  } else if (/\b(pj|pessoa juridica|b2b|contractor)\b/.test(norm)) {
    contract = "PJ";
  } else if (/\b(estagio|estagiario|intern|trainee)\b/.test(norm)) {
    contract = "Estágio";
  }

  return { mode, seniority, contract };
}

function getEffectiveDateMs(job: JobRecord): number {
  const raw = job.published_at || job.created_at;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : new Date(job.created_at).getTime();
}

function formatRelativeTime(
  dateStr: string | null | undefined,
  fallbackStr: string,
  nowMs: number
): { label: string; isNew: boolean } {
  const raw = dateStr || fallbackStr;
  const ts = new Date(raw).getTime();
  if (!Number.isFinite(ts) || nowMs <= 0) {
    return { label: "Recente", isNew: false };
  }
  const diffHours = Math.max(0, (nowMs - ts) / 3600000);
  if (diffHours < 24) {
    return {
      label: diffHours < 2 ? "Agora há pouco" : "Hoje",
      isNew: true,
    };
  }
  const days = Math.floor(diffHours / 24);
  if (days === 1) return { label: "Ontem", isNew: false };
  if (days <= 30) return { label: `Há ${days}d`, isNew: false };
  return {
    label: new Date(ts).toLocaleDateString("pt-BR"),
    isNew: false,
  };
}

function buildPitchText(
  job: JobRecord,
  user?: DashboardData["user"] | null,
  resume?: DbResumeRow | null
): string {
  const skillsList =
    resume?.skills && resume.skills.length > 0
      ? resume.skills.slice(0, 6).join(", ")
      : "desenvolvimento e tecnologia";
  const rolePart = resume?.target_role
    ? `, atuo na área de ${resume.target_role}`
    : "";
  const summaryPart = resume?.summary ? `${resume.summary}\n\n` : "";
  const linkedinPart = resume?.linkedin_url
    ? `\nLinkedIn: ${resume.linkedin_url}`
    : "";
  const portfolioPart = resume?.portfolio_url
    ? `\nPortfólio/GitHub: ${resume.portfolio_url}`
    : "";
  const phonePart = resume?.phone ? ` | ${resume.phone}` : "";

  return `Olá, equipe de recrutamento da ${job.company}!\n\nEstou me candidatando à vaga de ${job.title}. Meu nome é ${resume?.full_name || user?.name || "Candidato(a)"}${rolePart} e tenho experiência prática com ${skillsList}.\n\n${summaryPart}Estou à disposição para conversar e contribuir com os desafios da equipe.${linkedinPart}${portfolioPart}\nContato: ${resume?.email || user?.email || ""}${phonePart}`;
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
  const [nowMs, setNowMs] = useState<number>(0);

  // Busca estilo Indeed ("O quê" + "Onde") & Filtros avançados
  const [search, setSearch] = useState("");
  const [whereQuery, setWhereQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationDrawerOpen, setLocationDrawerOpen] = useState(false);
  const [jobStatusFilter, setJobStatusFilter] = useState<
    "all" | "saved" | "applied" | "pending"
  >("all");
  const [seniorityFilter, setSeniorityFilter] = useState<SeniorityFilter>("all");
  const [contractFilter, setContractFilter] = useState<ContractFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [matchFilter, setMatchFilter] = useState<MatchFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [visibleLimit, setVisibleLimit] = useState(30);

  // Master-Detail seleção de vaga (Indeed Split View)
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [noteEdits, setNoteEdits] = useState<Record<number, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<number | null>(null);

  // Buscas salvas (localStorage)
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);

  // Modal de carta de apresentação editável
  const [pitchJob, setPitchJob] = useState<JobRecord | null>(null);
  const [pitchDraft, setPitchDraft] = useState("");

  // Aba Candidaturas: filtro por etapa + anotação
  const [appStageFilter, setAppStageFilter] = useState<string>("all");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  // Aba Fontes: filtro de fontes
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all");

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

  const jobsListAnchorRef = useRef<HTMLDivElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5500);
  }, []);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as SavedSearchItem[];
          if (Array.isArray(parsed)) setSavedSearches(parsed);
        }
      } catch {
        // Ignore
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  const persistSavedSearches = (items: SavedSearchItem[]) => {
    setSavedSearches(items);
    try {
      localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(items));
    } catch {
      // Ignore
    }
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
      setNowMs(Date.now());
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
    const rafId = requestAnimationFrame(() => {
      setNowMs(Date.now());
      void fetchDashboard();
    });
    return () => cancelAnimationFrame(rafId);
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
    if (selectedJobId === jobId) {
      setSelectedJobId(null);
      setMobileDetailOpen(false);
    }
    await fetchDashboard();
  };

  const handleClearNonFavorites = async () => {
    await fetch("/api/jobs/clear", { method: "DELETE" });
    showToast("Vagas não favoritas/não candidatadas removidas.");
    await fetchDashboard();
  };

  const openPitchModal = (job: JobRecord) => {
    setPitchJob(job);
    setPitchDraft(buildPitchText(job, data?.user, data?.resume));
  };

  const handleSaveCurrentSearch = () => {
    const parts = [
      search.trim() || null,
      whereQuery.trim() || filterState || (filterCities[0] ?? null),
      workMode !== "all" ? workMode : null,
      seniorityFilter !== "all" ? seniorityFilter : null,
    ].filter(Boolean);

    const label =
      parts.length > 0
        ? parts.join(" · ")
        : `Busca ${onlyBrazil ? "Brasil" : "Global"}`;

    const entry: SavedSearchItem = {
      id: `${Date.now()}`,
      label,
      search,
      whereQuery,
      workMode,
      seniorityFilter,
      contractFilter,
      dateFilter,
      onlyBrazil,
    };

    const next = [
      entry,
      ...savedSearches.filter((s) => s.label !== entry.label),
    ].slice(0, 6);
    persistSavedSearches(next);
    showToast(`Busca "${label}" salva!`);
  };

  const applySavedSearch = (item: SavedSearchItem) => {
    setSearch(item.search);
    setWhereQuery(item.whereQuery);
    setWorkMode(item.workMode);
    setSeniorityFilter(item.seniorityFilter);
    setContractFilter(item.contractFilter);
    setDateFilter(item.dateFilter);
    setOnlyBrazil(item.onlyBrazil);
    setVisibleLimit(30);
  };

  const resetAllFilters = () => {
    setSearch("");
    setWhereQuery("");
    setWorkMode("all");
    setSeniorityFilter("all");
    setContractFilter("all");
    setDateFilter("all");
    setSourceFilter("all");
    setMatchFilter("all");
    setJobStatusFilter("all");
    setFilterState("");
    setFilterCities([]);
    setVisibleLimit(30);
  };

  const selectedStateObj = useMemo(
    () => BRAZIL_STATES.find((s) => s.uf === filterState) || null,
    [filterState]
  );

  const resumeObj = data?.resume;
  const jobsList = data?.jobs;
  const sourcesList = data?.sources;

  const resumeTerms = useMemo(() => {
    const terms: string[] = [];
    if (resumeObj?.skills && Array.isArray(resumeObj.skills)) {
      terms.push(...resumeObj.skills.map((s) => s.toLowerCase()));
    }
    if (resumeObj?.target_role) {
      terms.push(
        ...resumeObj.target_role
          .toLowerCase()
          .split(/\s+/)
          .filter((t) => t.length >= 3)
      );
    }
    return Array.from(new Set(terms));
  }, [resumeObj]);

  const sourceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of jobsList ?? []) {
      map.set(j.source_name, (map.get(j.source_name) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [jobsList]);

  const filteredJobs = useMemo(() => {
    if (!jobsList) return [];
    const q = normalizeForMatch(search.trim());
    const whereNorm = normalizeForMatch(whereQuery.trim());
    const locFilter: LocationFilter = {
      state: filterState,
      cities: filterCities,
      includeRemote,
      workMode,
      onlyBrazil,
    };

    const windowMsMap: Record<Exclude<DateFilter, "all">, number> = {
      "24h": 24 * 3600000,
      "3d": 3 * 24 * 3600000,
      "7d": 7 * 24 * 3600000,
      "14d": 14 * 24 * 3600000,
      "30d": 30 * 24 * 3600000,
    };

    const list = jobsList.filter((j) => {
      const hay = normalizeForMatch(
        `${j.title} ${j.company} ${j.location || ""} ${j.source_name}`
      );
      const matchesSearch = !q || hay.includes(q);

      const locHay = normalizeForMatch(`${j.title} ${j.location || ""}`);
      const matchesWhere = !whereNorm || locHay.includes(whereNorm);

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

      const matchesSeniority =
        seniorityFilter === "all"
          ? true
          : seniorityFilter === "estagio"
            ? /\b(estagio|estagiario|intern|trainee)\b/.test(locHay)
            : seniorityFilter === "junior"
              ? /\b(junior|jr)\b/.test(locHay)
              : seniorityFilter === "pleno"
                ? /\b(pleno|mid)\b/.test(locHay)
                : /\b(senior|sr|lead|especialista|staff)\b/.test(locHay);

      const matchesContract =
        contractFilter === "all"
          ? true
          : contractFilter === "clt"
            ? /\bclt\b/.test(hay)
            : contractFilter === "pj"
              ? /\b(pj|pessoa juridica|b2b|contractor)\b/.test(hay)
              : /\b(estagio|estagiario|intern|trainee)\b/.test(locHay);

      const matchesSource =
        sourceFilter === "all" || j.source_name === sourceFilter;

      const matchesDate =
        dateFilter === "all" || nowMs <= 0
          ? true
          : nowMs - getEffectiveDateMs(j) <= windowMsMap[dateFilter];

      const matchCount =
        resumeTerms.length > 0
          ? resumeTerms.filter((t) => hay.includes(t)).length
          : 0;
      const matchesSkillThreshold =
        matchFilter === "all"
          ? true
          : matchFilter === "any"
            ? matchCount >= 1
            : matchCount >= 2;

      return (
        matchesSearch &&
        matchesWhere &&
        matchesLoc &&
        matchesStatus &&
        matchesSeniority &&
        matchesContract &&
        matchesSource &&
        matchesDate &&
        matchesSkillThreshold
      );
    });

    if (sortBy === "company") {
      return [...list].sort((a, b) => a.company.localeCompare(b.company));
    }

    if (sortBy === "recent" || resumeTerms.length === 0) {
      return [...list].sort(
        (a, b) => getEffectiveDateMs(b) - getEffectiveDateMs(a)
      );
    }

    return [...list].sort((a, b) => {
      const hayA = `${a.title} ${a.company} ${a.location || ""}`.toLowerCase();
      const hayB = `${b.title} ${b.company} ${b.location || ""}`.toLowerCase();
      const scoreA = resumeTerms.filter((t) => hayA.includes(t)).length;
      const scoreB = resumeTerms.filter((t) => hayB.includes(t)).length;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return getEffectiveDateMs(b) - getEffectiveDateMs(a);
    });
  }, [
    jobsList,
    search,
    whereQuery,
    filterState,
    filterCities,
    includeRemote,
    workMode,
    onlyBrazil,
    jobStatusFilter,
    seniorityFilter,
    contractFilter,
    sourceFilter,
    dateFilter,
    matchFilter,
    sortBy,
    resumeTerms,
    nowMs,
  ]);

  const visibleJobs = useMemo(
    () => filteredJobs.slice(0, visibleLimit),
    [filteredJobs, visibleLimit]
  );

  const selectedJob = useMemo(
    () => filteredJobs.find((j) => j.id === selectedJobId) ?? filteredJobs[0] ?? null,
    [filteredJobs, selectedJobId]
  );

  const hasActiveFilters = Boolean(
    search.trim() ||
      whereQuery.trim() ||
      workMode !== "all" ||
      seniorityFilter !== "all" ||
      contractFilter !== "all" ||
      dateFilter !== "all" ||
      sourceFilter !== "all" ||
      matchFilter !== "all" ||
      jobStatusFilter !== "all" ||
      filterState ||
      filterCities.length > 0
  );

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

  const trackedJobs = useMemo(
    () =>
      (jobsList ?? []).filter(
        (j) => j.applied || j.saved || j.application_stage
      ),
    [jobsList]
  );

  const filteredApplications = useMemo(() => {
    if (appStageFilter === "all") return trackedJobs;
    return trackedJobs.filter((j) => {
      const effective =
        j.application_stage || (j.applied ? "enviado" : j.saved ? "salva" : "");
      return effective === appStageFilter;
    });
  }, [trackedJobs, appStageFilter]);

  const filteredSourcesList = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase();
    return (sourcesList ?? []).filter((src) => {
      const matchesQ =
        !q ||
        src.name.toLowerCase().includes(q) ||
        src.type.toLowerCase().includes(q) ||
        src.target.toLowerCase().includes(q);
      if (!matchesQ) return false;
      if (sourceTypeFilter === "all") return true;
      if (sourceTypeFilter === "global") {
        return NO_TARGET_TYPES.includes(src.type) || src.type === "rss";
      }
      if (sourceTypeFilter === "ats") {
        return ["greenhouse", "lever", "ashby", "workable", "smartrecruiters", "recruitee", "breezy"].includes(src.type);
      }
      return src.type === sourceTypeFilter;
    });
  }, [sourcesList, sourceSearch, sourceTypeFilter]);

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] text-sm font-medium text-[var(--text-secondary)]">
        Carregando portal de vagas...
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return <AuthGate onAuthenticated={fetchDashboard} />;
  }

  const renderJobDetailContent = (job: JobRecord) => {
    const hay = `${job.title} ${job.company} ${job.location || ""}`.toLowerCase();
    const matchedTerms = resumeTerms.filter((t) => hay.includes(t));
    const matchPct =
      resumeTerms.length > 0
        ? Math.min(
            100,
            Math.round(
              (matchedTerms.length / Math.min(6, resumeTerms.length)) * 100
            )
          )
        : 0;
    const badges = detectJobBadges(
      `${job.title} ${job.location || ""} ${job.source_name}`
    );
    const rel = formatRelativeTime(job.published_at, job.created_at, nowMs);
    const noteValue = noteEdits[job.id] ?? job.notes ?? "";

    return (
      <div className="space-y-5">
        {/* Cabeçalho do Detalhe */}
        <div className="space-y-4 border-b border-[var(--border-color)] pb-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--accent-soft)] text-base font-bold uppercase text-[var(--accent-bg)]">
              {(job.company || "V").trim().charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {rel.isNew && (
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                    Nova
                  </span>
                )}
                <span className="indeed-badge px-2 py-0.5 text-[11px]">
                  {job.source_name}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  · {rel.label}
                </span>
              </div>
              <h2 className="mt-1.5 text-xl font-bold leading-snug text-[var(--text-primary)]">
                {job.title}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                  <Building2 className="h-3.5 w-3.5 text-[var(--accent-bg)]" />
                  {job.company}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  {job.location || "Local não informado"}
                </span>
              </div>
            </div>
          </div>

          {/* Tags estruturadas */}
          <div className="flex flex-wrap gap-1.5">
            <span className="indeed-badge px-2.5 py-1 text-xs">
              {badges.mode}
            </span>
            {badges.seniority && (
              <span className="indeed-badge px-2.5 py-1 text-xs">
                {badges.seniority}
              </span>
            )}
            {badges.contract && (
              <span className="indeed-badge px-2.5 py-1 text-xs">
                {badges.contract}
              </span>
            )}
            {matchedTerms.length > 0 && (
              <span className="indeed-match-badge px-2.5 py-1 text-xs">
                {matchPct}% compatível ({matchedTerms.length} skills)
              </span>
            )}
          </div>

          {/* Ações Principais estilo Indeed */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="indeed-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm shadow-xs"
            >
              <span>Candidatar-se na fonte</span>
              <ExternalLink className="h-4 w-4" />
            </a>

            <button
              type="button"
              onClick={() => handleToggleJobFlag(job.id, { saved: !job.saved })}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs ${
                job.saved ? "indeed-pill-active" : "indeed-btn-secondary"
              }`}
              title={job.saved ? "Remover dos favoritos" : "Favoritar vaga"}
            >
              <Bookmark
                className={`h-4 w-4 ${job.saved ? "fill-current" : ""}`}
              />
              <span>{job.saved ? "Salva" : "Salvar"}</span>
            </button>

            <button
              type="button"
              onClick={() => openPitchModal(job)}
              className="indeed-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs"
            >
              <FileText className="h-4 w-4 text-[var(--accent-bg)]" />
              <span>Gerar Carta</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(job.url);
                showToast("Link da vaga copiado!");
              }}
              className="indeed-btn-secondary inline-flex items-center gap-1.5 px-3 py-2.5 text-xs"
              title="Copiar URL da vaga"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>

            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`site:glassdoor.com.br "${job.company}"`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="indeed-btn-secondary inline-flex items-center gap-1 px-3 py-2.5 text-xs"
              title="Pesquisar avaliações da empresa no Glassdoor"
            >
              <span>Glassdoor</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <button
              type="button"
              onClick={() => handleDeleteJob(job.id)}
              className="indeed-btn-secondary ml-auto inline-flex items-center gap-1 px-3 py-2.5 text-xs text-rose-600 hover:border-rose-500/40 dark:text-rose-400"
              title="Remover vaga"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Compatibilidade com Currículo */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent-bg)]" />
              Compatibilidade com seu Currículo
            </span>
            {resumeTerms.length > 0 && (
              <span className="text-xs font-bold text-[var(--accent-bg)]">
                {matchPct}%
              </span>
            )}
          </div>

          {resumeTerms.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Preencha suas habilidades na aba{" "}
              <button
                type="button"
                onClick={() => setActiveTab("resume")}
                className="font-semibold text-[var(--accent-bg)] underline"
              >
                Meu Currículo
              </button>{" "}
              para calcular a compatibilidade automaticamente.
            </p>
          ) : (
            <>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--border-color)]">
                <div
                  className="h-full rounded-full bg-[var(--accent-bg)] transition-all duration-300"
                  style={{ width: `${Math.max(6, matchPct)}%` }}
                />
              </div>
              {matchedTerms.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {matchedTerms.map((term) => (
                    <span
                      key={term}
                      className="rounded-md border border-emerald-500/30 bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
                    >
                      ✓ {term}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  Nenhuma skill do currículo aparece diretamente no título/local desta vaga.
                </p>
              )}
            </>
          )}
        </div>

        {/* Funil & Anotações Inline */}
        <div className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Acompanhamento da Candidatura
            </span>
            <select
              value={job.application_stage || (job.applied ? "enviado" : "")}
              onChange={(e) => {
                const stage = e.target.value;
                handleToggleJobFlag(job.id, {
                  application_stage: stage,
                  applied: Boolean(stage && stage !== "salva"),
                  saved: stage === "salva" ? true : job.saved,
                });
              }}
              className="px-3 py-1.5 text-xs font-semibold"
              aria-label="Etapa da candidatura"
            >
              {APPLICATION_STAGES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <textarea
              rows={3}
              value={noteValue}
              onChange={(e) =>
                setNoteEdits((prev) => ({ ...prev, [job.id]: e.target.value }))
              }
              placeholder="Anote aqui: contato do recrutador, faixa salarial, feedback da entrevista ou prazo do teste..."
              className="w-full p-2.5 text-xs"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[var(--text-muted)]">
                Capturada em{" "}
                {new Date(job.created_at).toLocaleDateString("pt-BR")}
              </span>
              <button
                type="button"
                disabled={savingNoteId === job.id}
                onClick={async () => {
                  setSavingNoteId(job.id);
                  try {
                    await handleToggleJobFlag(job.id, { notes: noteValue });
                    showToast("Anotação salva na vaga!");
                  } finally {
                    setSavingNoteId(null);
                  }
                }}
                className="indeed-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
              >
                {savingNoteId === job.id ? "Salvando..." : "Salvar anotação"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Top Navbar Estilo Indeed */}
      <header className="indeed-navbar sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <button
              type="button"
              onClick={() => setActiveTab("jobs")}
              className="flex items-center gap-2.5 py-3 text-left"
            >
              <div className="indeed-btn-primary flex h-9 w-9 items-center justify-center rounded-lg">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-base font-extrabold tracking-tight text-[var(--accent-bg)]">
                  HAF
                </span>
                <span className="hidden text-[10px] font-medium text-[var(--text-muted)] sm:block">
                  Monitor de Vagas
                </span>
              </div>
            </button>

            {/* Navegação Horizontal Desktop */}
            <nav
              className="hidden items-center gap-1 lg:flex"
              aria-label="Navegação principal"
            >
              {(
                [
                  {
                    id: "jobs",
                    label: "Buscar vagas",
                    count: data?.jobs.length ?? 0,
                  },
                  {
                    id: "applications",
                    label: "Minhas candidaturas",
                    count: trackedJobs.length,
                  },
                  { id: "resume", label: "Meu currículo" },
                  {
                    id: "settings",
                    label: "Alertas & Fontes",
                    count: data?.sources.length ?? 0,
                  },
                ] as Array<{ id: TabKey; label: string; count?: number }>
              ).map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative inline-flex items-center gap-2 border-b-2 px-3.5 py-4 text-sm transition ${
                      active
                        ? "border-[var(--accent-bg)] font-bold text-[var(--accent-bg)]"
                        : "border-transparent font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          active
                            ? "bg-[var(--accent-soft)] text-[var(--accent-bg)]"
                            : "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Ações à Direita */}
          <div className="flex items-center gap-2 py-2.5">
            <button
              type="button"
              onClick={handleRunScrape}
              disabled={running}
              className="indeed-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs disabled:opacity-50"
            >
              {running ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {running ? "Varrendo fontes..." : "Atualizar Vagas"}
              </span>
              <span className="sm:hidden">
                {running ? "Varrendo" : "Buscar"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleTestNotifications}
              disabled={testingAlert}
              className="indeed-btn-secondary hidden items-center gap-1.5 px-3 py-2 text-xs md:inline-flex disabled:opacity-50"
              title="Testar envio de alertas (Telegram / E-mail)"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>{testingAlert ? "Testando..." : "Testar Alertas"}</span>
            </button>

            <ThemeToggle />

            <div className="hidden items-center gap-2 border-l border-[var(--border-color)] pl-2 xl:flex">
              <span className="max-w-[130px] truncate text-xs font-semibold text-[var(--text-secondary)]">
                {data?.user?.name || "Usuário"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="indeed-btn-secondary hidden items-center gap-1.5 px-3 py-2 text-xs sm:inline-flex"
              title="Sair da conta"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Sair</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="indeed-btn-secondary inline-flex items-center justify-center p-2 lg:hidden"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Menu Mobile Expandido */}
        {mobileMenuOpen && (
          <div className="border-t border-[var(--border-color)] bg-[var(--bg-header)] px-4 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "jobs", label: `Vagas (${data?.jobs.length ?? 0})` },
                  {
                    id: "applications",
                    label: `Candidaturas (${trackedJobs.length})`,
                  },
                  { id: "resume", label: "Meu Currículo" },
                  {
                    id: "settings",
                    label: `Fontes (${data?.sources.length ?? 0})`,
                  },
                ] as Array<{ id: TabKey; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`rounded-lg px-3 py-2 text-left text-xs font-semibold ${
                    activeTab === tab.id
                      ? "indeed-btn-primary"
                      : "indeed-btn-secondary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[var(--border-color)] pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleTestNotifications();
                }}
                className="indeed-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
              >
                <Bell className="h-3.5 w-3.5" /> Testar Alertas
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="indeed-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
              >
                <LogOut className="h-3.5 w-3.5" /> Sair
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        {toast && (
          <div
            role="status"
            className="gupy-card flex items-center justify-between border-l-4 border-l-[var(--accent-bg)] px-4 py-3 text-sm font-medium"
          >
            <span>{toast}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="gupy-card border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">
            <strong>Atenção:</strong> {error}
          </div>
        )}

        {/* ==================== ABA 1: BUSCAR VAGAS (ESTILO INDEED) ==================== */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            {/* Barra de Busca Dupla Estilo Indeed ("O quê" + "Onde" + Botão "Achar vagas") */}
            <section className="mx-auto max-w-5xl space-y-3 pt-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setVisibleLimit(30);
                  jobsListAnchorRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
                }}
                className="indeed-search-shell flex flex-col items-stretch overflow-hidden sm:flex-row sm:items-center"
              >
                {/* Campo "O quê" */}
                <div className="flex flex-1 items-center gap-2.5 px-4 py-3">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--text-primary)]">
                    O quê
                  </span>
                  <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setVisibleLimit(30);
                    }}
                    placeholder="Cargo, skill, tecnologia ou empresa..."
                    className="indeed-raw-input w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      aria-label="Limpar busca"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Campo "Onde" */}
                <div className="flex flex-1 items-center gap-2.5 border-t border-[var(--border-color)] px-4 py-3 sm:border-t-0 sm:border-l">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--text-primary)]">
                    Onde
                  </span>
                  <MapPin className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    list="indeed-where-suggestions"
                    value={whereQuery}
                    onChange={(e) => {
                      setWhereQuery(e.target.value);
                      setVisibleLimit(30);
                    }}
                    placeholder="Cidade, estado ou 'Remoto'..."
                    className="indeed-raw-input w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  />
                  <datalist id="indeed-where-suggestions">
                    <option value="Remoto" />
                    <option value="Híbrido" />
                    <option value="São Paulo" />
                    <option value="Rio de Janeiro" />
                    <option value="Belo Horizonte" />
                    <option value="Curitiba" />
                    <option value="Florianópolis" />
                    <option value="Porto Alegre" />
                    <option value="Recife" />
                    <option value="Campinas" />
                  </datalist>
                  {whereQuery && (
                    <button
                      type="button"
                      onClick={() => setWhereQuery("")}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      aria-label="Limpar localização"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* CTA Achar Vagas */}
                <div className="p-2">
                  <button
                    type="submit"
                    className="indeed-btn-primary w-full px-6 py-2.5 text-sm sm:w-auto"
                  >
                    Achar vagas
                  </button>
                </div>
              </form>

              {/* Faixa Horizontal de Filtros Estilo Indeed */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value as DateFilter);
                      setVisibleLimit(30);
                    }}
                    className="indeed-raw-select bg-transparent font-semibold text-[var(--text-primary)] outline-none"
                    aria-label="Data de publicação"
                  >
                    <option value="all">Data: Qualquer</option>
                    <option value="24h">Últimas 24h</option>
                    <option value="3d">Últimos 3 dias</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="14d">Últimos 14 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                  </select>
                </div>

                <select
                  value={workMode}
                  onChange={(e) => {
                    setWorkMode(e.target.value as WorkModeFilter);
                    setVisibleLimit(30);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold"
                  aria-label="Modelo de trabalho"
                >
                  <option value="all">Modelo: Todos</option>
                  <option value="remote">100% Remoto</option>
                  <option value="hybrid">Híbrido</option>
                  <option value="onsite">Presencial</option>
                </select>

                <select
                  value={seniorityFilter}
                  onChange={(e) => {
                    setSeniorityFilter(e.target.value as SeniorityFilter);
                    setVisibleLimit(30);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold"
                  aria-label="Senioridade"
                >
                  <option value="all">Nível: Todos</option>
                  <option value="estagio">Estágio / Trainee</option>
                  <option value="junior">Júnior</option>
                  <option value="pleno">Pleno</option>
                  <option value="senior">Sênior / Especialista</option>
                </select>

                <select
                  value={contractFilter}
                  onChange={(e) => {
                    setContractFilter(e.target.value as ContractFilter);
                    setVisibleLimit(30);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold"
                  aria-label="Tipo de contrato"
                >
                  <option value="all">Contrato: Todos</option>
                  <option value="clt">CLT</option>
                  <option value="pj">PJ</option>
                  <option value="estagio">Estágio</option>
                </select>

                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value);
                    setVisibleLimit(30);
                  }}
                  className="max-w-[190px] px-3 py-1.5 text-xs font-semibold"
                  aria-label="Filtrar por fonte"
                >
                  <option value="all">Fonte: Todas ({sourceCounts.length})</option>
                  {sourceCounts.map(([srcName, count]) => (
                    <option key={srcName} value={srcName}>
                      {srcName} ({count})
                    </option>
                  ))}
                </select>

                <select
                  value={matchFilter}
                  onChange={(e) => {
                    setMatchFilter(e.target.value as MatchFilter);
                    setVisibleLimit(30);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold"
                  aria-label="Filtrar por compatibilidade"
                >
                  <option value="all">Match: Todos</option>
                  <option value="any">Com Match (1+ skill)</option>
                  <option value="strong">Alto Match (2+ skills)</option>
                </select>

                <select
                  value={jobStatusFilter}
                  onChange={(e) => {
                    setJobStatusFilter(
                      e.target.value as "all" | "saved" | "applied" | "pending"
                    );
                    setVisibleLimit(30);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold"
                  aria-label="Status da vaga"
                >
                  <option value="all">Status: Todas</option>
                  <option value="pending">Não candidatadas</option>
                  <option value="saved">Favoritas</option>
                  <option value="applied">Candidatadas</option>
                </select>

                <button
                  type="button"
                  onClick={() => setOnlyBrazil((v) => !v)}
                  className={onlyBrazil ? "indeed-pill-active" : "indeed-pill"}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>{onlyBrazil ? "Apenas Brasil" : "Global"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLocationDrawerOpen((v) => !v)}
                  className={
                    locationDrawerOpen || filterState || filterCities.length > 0
                      ? "indeed-pill-active"
                      : "indeed-pill"
                  }
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>
                    Região{" "}
                    {filterState || filterCities.length > 0
                      ? `(${[filterState, ...filterCities].filter(Boolean).join(", ")})`
                      : ""}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCurrentSearch}
                  className="indeed-pill"
                  title="Salvar combinação atual de busca"
                >
                  <Plus className="h-3.5 w-3.5 text-[var(--accent-bg)]" />
                  <span>Salvar busca</span>
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="text-xs font-semibold text-[var(--accent-bg)] hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              {/* Painel Avançado de Estado & Cidades (Salvo no Monitor) */}
              {locationDrawerOpen && (
                <div className="gupy-card space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <MapPin className="h-4 w-4 text-[var(--accent-bg)]" />
                      <span>Monitorar Estado e até 5 Cidades</span>
                      <span className="indeed-badge px-2 py-0.5 text-[11px]">
                        {filterCities.length}/5 cidades
                      </span>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={includeRemote}
                        onChange={(e) => setIncludeRemote(e.target.checked)}
                        className="h-3.5 w-3.5 rounded"
                      />
                      Incluir vagas remotas
                    </label>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <select
                        value={filterState}
                        onChange={(e) => setFilterState(e.target.value)}
                        className="w-full px-3 py-2 text-xs outline-none"
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
                            : "Adicionar cidade (até 5)..."
                        }
                        className="w-full px-3 py-2 text-xs outline-none disabled:opacity-50"
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
                        className="indeed-btn-secondary shrink-0 px-3 py-2 text-xs disabled:opacity-40"
                      >
                        + Cidade
                      </button>
                    </div>

                    <div className="flex gap-2 sm:col-span-3">
                      <button
                        type="button"
                        disabled={savingLocation}
                        onClick={() => handleSaveLocationFilter()}
                        className="indeed-btn-primary w-full px-3 py-2 text-xs disabled:opacity-50"
                      >
                        {savingLocation ? "Salvando..." : "Salvar no Monitor"}
                      </button>
                    </div>
                  </div>

                  {filterCities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {filterCities.map((city) => (
                        <span
                          key={city}
                          className="indeed-badge inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
                        >
                          {city}
                          <button
                            type="button"
                            onClick={() => handleRemoveCity(city)}
                            className="font-bold hover:opacity-70"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Buscas Salvas (atalhos rápidos) */}
              {savedSearches.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                    Buscas salvas:
                  </span>
                  {savedSearches.map((item) => (
                    <div
                      key={item.id}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] pl-3 pr-1.5 py-1 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => applySavedSearch(item)}
                        className="font-semibold text-[var(--accent-bg)] hover:underline"
                      >
                        {item.label}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          persistSavedSearches(
                            savedSearches.filter((s) => s.id !== item.id)
                          )
                        }
                        className="rounded-full p-0.5 text-[var(--text-muted)] hover:text-rose-600"
                        aria-label="Excluir busca salva"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Barra de Resultados & Ações */}
            <div
              ref={jobsListAnchorRef}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] pt-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span>
                  Exibindo{" "}
                  <strong className="text-[var(--text-primary)]">
                    {filteredJobs.length}
                  </strong>{" "}
                  de {data?.jobs.length ?? 0} vagas
                </span>
                {data?.resume?.target_role && (
                  <span className="indeed-match-badge px-2 py-0.5 text-[11px]">
                    Currículo: {data.resume.target_role}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-2.5 py-1.5 text-xs font-semibold"
                  aria-label="Ordenar vagas"
                >
                  <option value="match">Ordenar: Relevância (Match)</option>
                  <option value="recent">Ordenar: Mais recentes</option>
                  <option value="company">Ordenar: Empresa (A–Z)</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={filteredJobs.length === 0}
                  className="indeed-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearNonFavorites}
                  className="indeed-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Limpar não favoritas</span>
                </button>
              </div>
            </div>

            {/* Indeed Master-Detail Split View */}
            {filteredJobs.length === 0 ? (
              <div className="gupy-card border-dashed py-16 text-center">
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  Nenhuma vaga corresponde aos filtros atuais.
                </p>
                <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                  Tente limpar os filtros, ajustar seu{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("resume")}
                    className="font-semibold text-[var(--accent-bg)] underline"
                  >
                    Meu Currículo
                  </button>{" "}
                  ou clicar em <strong>Atualizar Vagas</strong>.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="indeed-btn-primary mt-4 px-4 py-2 text-xs"
                  >
                    Resetar todos os filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid items-start gap-5 lg:grid-cols-12">
                {/* Coluna Esquerda: Lista de Cards Compactos */}
                <div className="space-y-2.5 lg:col-span-5">
                  {visibleJobs.map((job) => {
                    const isSelected = selectedJob?.id === job.id;
                    const hay = `${job.title} ${job.company} ${job.location || ""}`.toLowerCase();
                    const matchedCount = resumeTerms.filter((t) =>
                      hay.includes(t)
                    ).length;
                    const badges = detectJobBadges(
                      `${job.title} ${job.location || ""} ${job.source_name}`
                    );
                    const rel = formatRelativeTime(
                      job.published_at,
                      job.created_at,
                      nowMs
                    );

                    return (
                      <article
                        key={job.id}
                        onClick={() => {
                          setSelectedJobId(job.id);
                          setMobileDetailOpen(true);
                        }}
                        className={`cursor-pointer p-4 ${
                          isSelected
                            ? "indeed-job-card-selected"
                            : "indeed-job-card"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {rel.isNew && (
                              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                                Nova
                              </span>
                            )}
                            {matchedCount > 0 && (
                              <span className="indeed-match-badge px-2 py-0.5 text-[10px]">
                                {matchedCount} match
                              </span>
                            )}
                            <span className="indeed-badge px-2 py-0.5 text-[10px]">
                              {job.source_name}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleJobFlag(job.id, { saved: !job.saved });
                            }}
                            className={`rounded-lg p-1 transition ${
                              job.saved
                                ? "text-[var(--accent-bg)]"
                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            }`}
                            aria-label="Favoritar vaga"
                            title="Favoritar vaga"
                          >
                            <Bookmark
                              className={`h-4 w-4 ${job.saved ? "fill-current" : ""}`}
                            />
                          </button>
                        </div>

                        <h3 className="mt-1.5 line-clamp-2 text-base font-bold leading-snug text-[var(--text-primary)]">
                          {job.title}
                        </h3>

                        <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
                          {job.company}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {job.location || "Local não informado"}
                          </span>
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="indeed-badge px-2 py-0.5 text-[10px]">
                            {badges.mode}
                          </span>
                          {badges.seniority && (
                            <span className="indeed-badge px-2 py-0.5 text-[10px]">
                              {badges.seniority}
                            </span>
                          )}
                          {badges.contract && (
                            <span className="indeed-badge px-2 py-0.5 text-[10px]">
                              {badges.contract}
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span>{rel.label}</span>
                          {(job.application_stage || job.applied) && (
                            <span className="font-semibold text-[var(--accent-bg)]">
                              {APPLICATION_STAGES.find(
                                (s) =>
                                  s.value ===
                                  (job.application_stage ||
                                    (job.applied ? "enviado" : ""))
                              )?.label || "Candidatada"}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}

                  {filteredJobs.length > visibleLimit && (
                    <button
                      type="button"
                      onClick={() => setVisibleLimit((v) => v + 30)}
                      className="indeed-btn-secondary w-full py-2.5 text-xs"
                    >
                      Carregar mais vagas ({filteredJobs.length - visibleLimit}{" "}
                      restantes)
                    </button>
                  )}
                </div>

                {/* Coluna Direita: Painel Fixo de Detalhes (Desktop) */}
                <div className="hidden lg:sticky lg:top-20 lg:col-span-7 lg:block">
                  {selectedJob ? (
                    <div className="indeed-detail-pane max-h-[calc(100vh-6.5rem)] overflow-y-auto p-6">
                      {renderJobDetailContent(selectedJob)}
                    </div>
                  ) : (
                    <div className="indeed-detail-pane p-10 text-center text-sm text-[var(--text-secondary)]">
                      Selecione uma vaga à esquerda para ver detalhes completos.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Drawer Mobile para Detalhes da Vaga */}
            {mobileDetailOpen && selectedJob && (
              <div
                className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-xs lg:hidden"
                role="dialog"
                aria-modal="true"
                onClick={() => setMobileDetailOpen(false)}
              >
                <div
                  className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border-t border-[var(--border-color)] bg-[var(--bg-card)] p-5 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-3 flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Detalhes da Vaga
                    </span>
                    <button
                      type="button"
                      onClick={() => setMobileDetailOpen(false)}
                      className="indeed-btn-secondary p-1.5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {renderJobDetailContent(selectedJob)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== ABA 2: MINHAS CANDIDATURAS ==================== */}
        {activeTab === "applications" && (
          <div className="space-y-5">
            {/* Funil clicável */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <button
                type="button"
                onClick={() => setAppStageFilter("all")}
                className={`p-4 text-left ${
                  appStageFilter === "all"
                    ? "indeed-job-card-selected"
                    : "indeed-job-card"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Todas no Funil
                </p>
                <p className="mt-1 text-2xl font-bold">{trackedJobs.length}</p>
              </button>

              {(
                [
                  ["salva", "Salvas"],
                  ["enviado", "Enviadas"],
                  ["teste", "Teste Técnico"],
                  ["entrevista", "Entrevista"],
                  ["proposta", "Proposta"],
                ] as const
              ).map(([stageKey, stageLabel]) => {
                const count = trackedJobs.filter((j) => {
                  const effective =
                    j.application_stage ||
                    (j.applied ? "enviado" : j.saved ? "salva" : "");
                  return effective === stageKey;
                }).length;
                const active = appStageFilter === stageKey;

                return (
                  <button
                    key={stageKey}
                    type="button"
                    onClick={() =>
                      setAppStageFilter(active ? "all" : stageKey)
                    }
                    className={`p-4 text-left ${
                      active ? "indeed-job-card-selected" : "indeed-job-card"
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {stageLabel}
                    </p>
                    <p className="mt-1 text-2xl font-bold">{count}</p>
                  </button>
                );
              })}
            </div>

            <section className="gupy-card p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">
                    Processos Seletivos em Acompanhamento
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Clique nos cards acima para filtrar por etapa e registre anotações.
                  </p>
                </div>
                {appStageFilter !== "all" && (
                  <button
                    type="button"
                    onClick={() => setAppStageFilter("all")}
                    className="text-xs font-semibold text-[var(--accent-bg)] hover:underline"
                  >
                    Mostrar todas
                  </button>
                )}
              </div>

              {filteredApplications.length === 0 ? (
                <div className="gupy-subcard py-14 text-center">
                  <p className="text-sm text-[var(--text-primary)]">
                    Nenhuma candidatura nesta etapa.
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Na aba <strong>Buscar vagas</strong>, salve ou selecione uma
                    etapa para acompanhar seus processos aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredApplications.map((job) => (
                    <div
                      key={job.id}
                      className="indeed-job-card space-y-3 p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="indeed-badge px-2 py-0.5 text-[11px]">
                              {job.source_name}
                            </span>
                            <span className="indeed-match-badge px-2 py-0.5 text-[11px]">
                              {APPLICATION_STAGES.find(
                                (s) =>
                                  s.value ===
                                  (job.application_stage ||
                                    (job.applied ? "enviado" : "salva"))
                              )?.label || "Salva"}
                            </span>
                          </div>
                          <h3 className="truncate font-bold">{job.title}</h3>
                          <p className="text-xs text-[var(--text-secondary)]">
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
                            className="px-2.5 py-2 text-xs font-semibold"
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
                            className="indeed-btn-secondary px-3 py-2 text-xs"
                          >
                            {job.notes ? "Editar Anotação" : "+ Anotação"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openPitchModal(job)}
                            className="indeed-btn-secondary px-3 py-2 text-xs"
                          >
                            Carta
                          </button>

                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="indeed-btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
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
                              className="indeed-btn-secondary px-3 py-1.5 text-xs"
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
                              className="indeed-btn-primary px-3 py-1.5 text-xs"
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
          </div>
        )}

        {/* Modal de Carta de Apresentação Editável */}
        {pitchJob && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            onClick={() => setPitchJob(null)}
          >
            <div
              className="gupy-card w-full max-w-lg space-y-4 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold">
                  Carta de Apresentação para {pitchJob.company}
                </h3>
                <button
                  type="button"
                  onClick={() => setPitchJob(null)}
                  className="indeed-btn-secondary p-1.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Gerada automaticamente para{" "}
                <strong>{pitchJob.title}</strong>. Você pode editar o texto
                abaixo antes de copiar.
              </p>

              <textarea
                rows={9}
                value={pitchDraft}
                onChange={(e) => setPitchDraft(e.target.value)}
                className="w-full p-3 text-xs leading-relaxed"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPitchJob(null)}
                  className="indeed-btn-secondary px-4 py-2 text-xs"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(pitchDraft);
                    showToast("Carta copiada para a área de transferência!");
                  }}
                  className="indeed-btn-primary px-4 py-2 text-xs"
                >
                  Copiar Texto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== ABA 3: MEU CURRÍCULO ==================== */}
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

        {/* ==================== ABA 4: ALERTAS & FONTES ==================== */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Status das Integrações */}
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="gupy-card flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-bg)]">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Telegram Bot</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Alertas instantâneos no Chat ID
                    </p>
                  </div>
                </div>
                {data?.integrations.telegram ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-[var(--text-muted)]" />
                )}
              </div>

              <div className="gupy-card flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-bg)]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">E-mail (Resend)</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Resumo automático por e-mail
                    </p>
                  </div>
                </div>
                {data?.integrations.email ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-[var(--text-muted)]" />
                )}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-5">
                {/* Destino dos Alertas */}
                <section className="gupy-card p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[var(--accent-bg)]" />
                    <h2 className="font-bold">Receber Alertas</h2>
                  </div>
                  <form onSubmit={handleSaveSettings} className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        E-mail para receber vagas
                      </label>
                      <input
                        type="email"
                        value={alertEmail}
                        onChange={(e) => setAlertEmail(e.target.value)}
                        placeholder="seu-email@exemplo.com"
                        className="w-full px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Telegram Chat ID (opcional)
                      </label>
                      <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="Ex: 123456789"
                        className="w-full px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="indeed-btn-primary w-full py-2.5 text-sm disabled:opacity-50"
                    >
                      {savingSettings
                        ? "Salvando..."
                        : "Salvar Destino dos Alertas"}
                    </button>
                  </form>
                </section>

                {/* Palavras-chave */}
                <section className="gupy-card p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Filter className="h-4 w-4 text-[var(--accent-bg)]" />
                    <h2 className="font-bold">
                      Palavras-chave (Sincronizadas com Currículo)
                    </h2>
                  </div>
                  <form onSubmit={handleAddKeyword} className="mb-3 flex gap-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Ex: React, Python, Pleno..."
                      className="w-full px-3 py-1.5 text-sm outline-none"
                    />
                    <button
                      type="submit"
                      className="indeed-btn-primary px-3 py-1.5 text-sm"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </form>

                  <div className="flex flex-wrap gap-2">
                    {data?.keywords.length === 0 && (
                      <span className="text-xs text-[var(--text-muted)]">
                        Nenhum filtro ativo (capturando tudo).
                      </span>
                    )}
                    {data?.keywords.map((kw) => (
                      <span
                        key={kw.id}
                        className="indeed-match-badge inline-flex items-center gap-1.5 px-3 py-1 text-xs"
                      >
                        {kw.term}
                        <button
                          type="button"
                          onClick={() => handleDeleteKeyword(kw.id)}
                          className="hover:text-rose-600"
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
                <section className="gupy-card p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[var(--accent-bg)]" />
                    <h2 className="font-bold">Adicionar Fonte Extra</h2>
                  </div>

                  <form
                    onSubmit={handleAddSource}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Conector
                      </label>
                      <select
                        value={sourceType}
                        onChange={(e) =>
                          setSourceType(e.target.value as SourceType)
                        }
                        className="w-full px-3 py-2 text-sm outline-none"
                      >
                        {Object.entries(SOURCE_HELP).map(([key, info]) => (
                          <option key={key} value={key}>
                            {info.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                        Nome de exibição
                      </label>
                      <input
                        type="text"
                        required
                        value={sourceName}
                        onChange={(e) => setSourceName(e.target.value)}
                        placeholder="Ex: Nubank Tech"
                        className="w-full px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    {!NO_TARGET_TYPES.includes(sourceType) && (
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                          URL ou Slug da Empresa
                        </label>
                        <input
                          type="text"
                          required
                          value={sourceTarget}
                          onChange={(e) => setSourceTarget(e.target.value)}
                          placeholder={SOURCE_HELP[sourceType].placeholder}
                          className="w-full px-3 py-2 text-sm outline-none"
                        />
                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                          {SOURCE_HELP[sourceType].hint}
                        </p>
                      </div>
                    )}

                    {sourceType === "html" && (
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                          Seletor CSS (opcional)
                        </label>
                        <input
                          type="text"
                          value={sourceSelector}
                          onChange={(e) => setSourceSelector(e.target.value)}
                          placeholder="Ex: .job-card a"
                          className="w-full px-3 py-2 text-sm outline-none"
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        className="indeed-btn-primary w-full py-2.5 text-sm"
                      >
                        Adicionar Fonte
                      </button>
                    </div>
                  </form>
                </section>

                <section className="gupy-card space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold">
                      Fontes Varridas Simultaneamente (
                      {data?.sources.length ?? 0})
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
                      className="indeed-pill-active text-xs"
                    >
                      + Carregar Fontes Confiáveis ({DEFAULT_SOURCES.length})
                    </button>
                  </div>

                  {/* Busca e Filtro das Fontes */}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={sourceSearch}
                        onChange={(e) => setSourceSearch(e.target.value)}
                        placeholder="Filtrar fontes por nome ou tipo..."
                        className="w-full py-1.5 pr-3 pl-8 text-xs"
                      />
                    </div>
                    <select
                      value={sourceTypeFilter}
                      onChange={(e) => setSourceTypeFilter(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <option value="all">Todos os tipos</option>
                      <option value="gupy">Gupy (Brasil)</option>
                      <option value="ats">Greenhouse / Lever / Ashby / SmartRecruiters</option>
                      <option value="github_issues">GitHub Vagas</option>
                      <option value="global">APIs Globais &amp; RSS</option>
                    </select>
                  </div>

                  <div className="grid max-h-[28rem] gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
                    {filteredSourcesList.map((src) => (
                      <div
                        key={src.id}
                        className="gupy-subcard flex items-start justify-between gap-2 p-3"
                      >
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {src.name}
                          </span>
                          <p className="truncate text-[11px] text-[var(--text-muted)]">
                            {src.type} • {src.last_status || "Pronta"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleSource(src)}
                            className={`rounded px-2 py-1 text-[11px] font-semibold ${
                              src.enabled
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                            }`}
                          >
                            {src.enabled ? "Ativa" : "Pausada"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSource(src.id)}
                            className="text-[var(--text-muted)] hover:text-rose-600"
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
            <section className="gupy-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--accent-bg)]" />
                <h2 className="font-bold">
                  Histórico de Varreduras ({data?.runs.length ?? 0})
                </h2>
              </div>

              {!data?.runs || data.runs.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">
                  Nenhuma varredura executada ainda.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.runs.map((run) => (
                    <div key={run.id} className="gupy-subcard p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {new Date(run.started_at).toLocaleString("pt-BR")}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            run.status === "success"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : run.status === "partial"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[var(--text-secondary)]">
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

import * as cheerio from "cheerio";
import crypto from "crypto";
import type { ScrapedJob, SourceRecord } from "./types";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/json,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
};

function makeHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 24);
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao acessar ${url}`);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeRemotive(): Promise<ScrapedJob[]> {
  const res = await fetchWithTimeout("https://remotive.com/api/remote-jobs?limit=50");
  const data = (await res.json()) as {
    jobs?: Array<{
      id: number;
      title: string;
      company_name: string;
      candidate_required_location?: string;
      url: string;
      publication_date?: string;
    }>;
  };

  return (data.jobs ?? []).map((job) => ({
    externalId: `remotive:${job.id}`,
    title: job.title,
    company: job.company_name || "Empresa não informada",
    location: job.candidate_required_location || "Remoto",
    url: job.url,
    publishedAt: job.publication_date,
  }));
}

async function scrapeArbeitnow(): Promise<ScrapedJob[]> {
  const res = await fetchWithTimeout("https://www.arbeitnow.com/api/job-board-api");
  const data = (await res.json()) as {
    data?: Array<{
      slug: string;
      title: string;
      company_name: string;
      location?: string;
      remote?: boolean;
      url: string;
      created_at?: number;
    }>;
  };

  return (data.data ?? []).slice(0, 50).map((job) => ({
    externalId: `arbeitnow:${job.slug}`,
    title: job.title,
    company: job.company_name || "Empresa não informada",
    location: job.remote ? `${job.location || ""} (Remoto)`.trim() : job.location || "Não informado",
    url: job.url,
    publishedAt: job.created_at
      ? new Date(job.created_at * 1000).toISOString()
      : undefined,
  }));
}

async function scrapeGreenhouse(target: string): Promise<ScrapedJob[]> {
  // Aceita slug ("nubank") ou URL ("https://boards.greenhouse.io/nubank")
  const slug = target
    .replace(/^https?:\/\/(boards|job-boards)\.greenhouse\.io\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  const res = await fetchWithTimeout(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs`
  );
  const data = (await res.json()) as {
    jobs?: Array<{
      id: number;
      title: string;
      location?: { name?: string };
      absolute_url: string;
      updated_at?: string;
    }>;
  };

  return (data.jobs ?? []).map((job) => ({
    externalId: `greenhouse:${slug}:${job.id}`,
    title: job.title,
    company: slug,
    location: job.location?.name || "Não informado",
    url: job.absolute_url,
    publishedAt: job.updated_at,
  }));
}

async function scrapeLever(target: string): Promise<ScrapedJob[]> {
  // Aceita slug ("netflix") ou URL ("https://jobs.lever.co/netflix")
  const slug = target
    .replace(/^https?:\/\/jobs\.lever\.co\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  const res = await fetchWithTimeout(
    `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`
  );
  const data = (await res.json()) as Array<{
    id: string;
    text: string;
    categories?: { location?: string; commitment?: string };
    hostedUrl: string;
    createdAt?: number;
  }>;

  return (data ?? []).map((job) => ({
    externalId: `lever:${slug}:${job.id}`,
    title: job.text,
    company: slug,
    location: job.categories?.location || job.categories?.commitment || "Não informado",
    url: job.hostedUrl,
    publishedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
  }));
}

async function scrapeGupy(target: string): Promise<ScrapedJob[]> {
  // Aceita subdomínio ("nubank") ou URL ("https://nubank.gupy.io")
  const clean = target.trim();
  const baseUrl = clean.startsWith("http")
    ? clean.replace(/\/+$/, "")
    : `https://${clean}.gupy.io`;

  const res = await fetchWithTimeout(baseUrl);
  const html = await res.text();
  const $ = cheerio.load(html);

  const jobs: ScrapedJob[] = [];

  // 1. Tenta extrair do __NEXT_DATA__ (padrão das páginas Gupy)
  const nextDataRaw = $("#__NEXT_DATA__").html();
  if (nextDataRaw) {
    try {
      const nextData = JSON.parse(nextDataRaw) as {
        props?: {
          pageProps?: {
            jobs?: Array<{
              id?: number | string;
              name?: string;
              title?: string;
              city?: string;
              state?: string;
              isRemoteWork?: boolean;
              jobUrl?: string;
              publishedDate?: string;
            }>;
            initialState?: {
              jobs?: Array<{
                id?: number | string;
                name?: string;
                title?: string;
                city?: string;
                state?: string;
                isRemoteWork?: boolean;
                jobUrl?: string;
                publishedDate?: string;
              }>;
            };
          };
        };
      };
      const list =
        nextData.props?.pageProps?.jobs ??
        nextData.props?.pageProps?.initialState?.jobs ??
        [];

      for (const item of list) {
        const title = item.name || item.title;
        if (!title) continue;
        const jobUrl = item.jobUrl
          ? item.jobUrl.startsWith("http")
            ? item.jobUrl
            : `${baseUrl}${item.jobUrl}`
          : `${baseUrl}/jobs/${item.id ?? makeHash(title)}`;
        const locParts = [item.city, item.state].filter(Boolean).join(" - ");
        const location = item.isRemoteWork
          ? locParts
            ? `${locParts} (Remoto)`
            : "Remoto"
          : locParts || "Brasil";

        jobs.push({
          externalId: `gupy:${makeHash(jobUrl)}`,
          title,
          company: new URL(baseUrl).hostname.split(".")[0],
          location,
          url: jobUrl,
          publishedAt: item.publishedDate,
        });
      }
    } catch {
      // Fallback para HTML abaixo
    }
  }

  // 2. Fallback para links de vaga no HTML
  if (jobs.length === 0) {
    $('a[href*="/jobs/"]').each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).text().replace(/\s+/g, " ").trim();
      if (!href || !title || title.length < 4) return;
      const fullUrl = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
      jobs.push({
        externalId: `gupy:${makeHash(fullUrl)}`,
        title,
        company: new URL(baseUrl).hostname.split(".")[0],
        location: "Brasil",
        url: fullUrl,
      });
    });
  }

  return jobs;
}

async function scrapeRss(url: string, sourceName: string): Promise<ScrapedJob[]> {
  const res = await fetchWithTimeout(url);
  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const jobs: ScrapedJob[] = [];

  // RSS 2.0 (<item>)
  $("item").each((_, el) => {
    const title = $(el).find("title").first().text().trim();
    const link = $(el).find("link").first().text().trim();
    const pubDate = $(el).find("pubDate").first().text().trim();
    const guid = $(el).find("guid").first().text().trim() || link;
    if (!title || !link) return;

    jobs.push({
      externalId: `rss:${makeHash(guid)}`,
      title,
      company: sourceName,
      location: "Ver descrição",
      url: link,
      publishedAt: pubDate || undefined,
    });
  });

  // Atom (<entry>)
  if (jobs.length === 0) {
    $("entry").each((_, el) => {
      const title = $(el).find("title").first().text().trim();
      const link =
        $(el).find("link").first().attr("href") ||
        $(el).find("link").first().text().trim();
      const updated = $(el).find("updated").first().text().trim();
      const id = $(el).find("id").first().text().trim() || link;
      if (!title || !link) return;

      jobs.push({
        externalId: `atom:${makeHash(id)}`,
        title,
        company: sourceName,
        location: "Ver descrição",
        url: link,
        publishedAt: updated || undefined,
      });
    });
  }

  return jobs;
}

async function scrapeHtml(
  url: string,
  sourceName: string,
  customSelector?: string | null
): Promise<ScrapedJob[]> {
  const res = await fetchWithTimeout(url);
  const html = await res.text();
  const $ = cheerio.load(html);
  const jobs: ScrapedJob[] = [];
  const seenUrls = new Set<string>();

  // 1. Tenta extrair dados estruturados JSON-LD (JobPosting)
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html();
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item?.["@type"] === "JobPosting" && item.title) {
          const jobUrl = item.url || url;
          if (seenUrls.has(jobUrl)) continue;
          seenUrls.add(jobUrl);
          jobs.push({
            externalId: `html:${makeHash(`${jobUrl}:${item.title}`)}`,
            title: String(item.title).trim(),
            company: item.hiringOrganization?.name || sourceName,
            location:
              item.jobLocation?.address?.addressLocality ||
              item.jobLocationType ||
              "Ver página",
            url: jobUrl,
            publishedAt: item.datePosted,
          });
        }
      }
    } catch {
      // Ignora JSON-LD inválido
    }
  });

  if (jobs.length > 0) return jobs;

  // 2. Seletor CSS customizado ou heurística inteligente de links de vaga
  const selector =
    customSelector && customSelector.trim().length > 0
      ? customSelector.trim()
      : 'a[href*="job"], a[href*="vaga"], a[href*="career"], a[href*="position"], a[href*="oportunidade"], a[href*="opening"]';

  $(selector).each((_, el) => {
    const anchor = $(el).is("a") ? $(el) : $(el).find("a").first();
    const href = anchor.attr("href");
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || !title || title.length < 4 || title.length > 140) return;
    if (href.startsWith("#") || href.startsWith("javascript:")) return;

    let fullUrl: string;
    try {
      fullUrl = new URL(href, url).toString();
    } catch {
      return;
    }

    if (seenUrls.has(fullUrl)) return;
    seenUrls.add(fullUrl);

    jobs.push({
      externalId: `html:${makeHash(fullUrl)}`,
      title,
      company: sourceName,
      location: "Ver página",
      url: fullUrl,
    });
  });

  return jobs.slice(0, 60);
}

async function scrapeRemoteOK(): Promise<ScrapedJob[]> {
  const res = await fetchWithTimeout("https://remoteok.com/api");
  const data = (await res.json()) as Array<{
    id?: string | number;
    position?: string;
    company?: string;
    location?: string;
    url?: string;
    date?: string;
  }>;

  // O primeiro item do array da API do RemoteOK é metadado legal
  return (data ?? [])
    .slice(1, 51)
    .filter((item) => item.position && item.url)
    .map((job) => ({
      externalId: `remoteok:${job.id ?? makeHash(job.url!)}`,
      title: job.position!,
      company: job.company || "Empresa não informada",
      location: job.location || "Remoto",
      url: job.url!,
      publishedAt: job.date,
    }));
}

async function scrapeJobicy(): Promise<ScrapedJob[]> {
  const res = await fetchWithTimeout(
    "https://jobicy.com/api/v2/remote-jobs?count=50"
  );
  const data = (await res.json()) as {
    jobs?: Array<{
      id: number | string;
      jobTitle: string;
      companyName?: string;
      jobGeo?: string;
      url: string;
      pubDate?: string;
    }>;
  };

  return (data.jobs ?? []).map((job) => ({
    externalId: `jobicy:${job.id}`,
    title: job.jobTitle,
    company: job.companyName || "Empresa não informada",
    location: job.jobGeo || "Remoto",
    url: job.url,
    publishedAt: job.pubDate,
  }));
}

async function scrapeHimalayas(): Promise<ScrapedJob[]> {
  const res = await fetchWithTimeout("https://himalayas.app/jobs/api?limit=50");
  const data = (await res.json()) as {
    jobs?: Array<{
      guid?: string;
      title: string;
      companyName?: string;
      locationRestrictions?: string[];
      applicationLink?: string;
      pubDate?: number;
    }>;
  };

  return (data.jobs ?? [])
    .filter((j) => j.title && (j.applicationLink || j.guid))
    .map((job) => {
      const url = job.applicationLink || job.guid!;
      return {
        externalId: `himalayas:${makeHash(job.guid || url)}`,
        title: job.title,
        company: job.companyName || "Empresa não informada",
        location:
          job.locationRestrictions && job.locationRestrictions.length > 0
            ? job.locationRestrictions.join(", ")
            : "Remoto",
        url,
        publishedAt: job.pubDate
          ? new Date(job.pubDate * 1000).toISOString()
          : undefined,
      };
    });
}

async function scrapeAshby(target: string): Promise<ScrapedJob[]> {
  const slug = target
    .replace(/^https?:\/\/jobs\.ashbyhq\.com\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  const res = await fetchWithTimeout(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`
  );
  const data = (await res.json()) as {
    jobs?: Array<{
      id: string;
      title: string;
      location?: string;
      isRemote?: boolean;
      jobUrl: string;
      publishedAt?: string;
    }>;
  };

  return (data.jobs ?? []).map((job) => ({
    externalId: `ashby:${slug}:${job.id}`,
    title: job.title,
    company: slug,
    location: job.isRemote
      ? `${job.location || ""} (Remoto)`.trim()
      : job.location || "Não informado",
    url: job.jobUrl,
    publishedAt: job.publishedAt,
  }));
}

async function scrapeWorkable(target: string): Promise<ScrapedJob[]> {
  const slug = target
    .replace(/^https?:\/\/apply\.workable\.com\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  const res = await fetchWithTimeout(
    `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}`
  );
  const data = (await res.json()) as {
    name?: string;
    jobs?: Array<{
      shortcode: string;
      title: string;
      city?: string;
      country?: string;
      telecommuting?: boolean;
      url: string;
      published_on?: string;
    }>;
  };

  return (data.jobs ?? []).map((job) => {
    const loc = [job.city, job.country].filter(Boolean).join(", ");
    return {
      externalId: `workable:${slug}:${job.shortcode}`,
      title: job.title,
      company: data.name || slug,
      location: job.telecommuting
        ? `${loc || ""} (Remoto)`.trim()
        : loc || "Não informado",
      url: job.url,
      publishedAt: job.published_on,
    };
  });
}

async function scrapeGithubIssues(
  target: string,
  sourceName: string
): Promise<ScrapedJob[]> {
  // Aceita "frontendbr/vagas" ou "https://github.com/frontendbr/vagas"
  const repo = target
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\/(issues|pulls).*$/i, "")
    .replace(/\/+$/, "")
    .trim();

  const res = await fetchWithTimeout(
    `https://api.github.com/repos/${repo}/issues?state=open&per_page=30`
  );
  const data = (await res.json()) as Array<{
    id: number;
    title: string;
    html_url: string;
    created_at?: string;
    pull_request?: unknown;
    labels?: Array<{ name?: string }>;
  }>;

  return (data ?? [])
    .filter((issue) => !issue.pull_request && issue.title)
    .map((issue) => ({
      externalId: `gh:${repo}:${issue.id}`,
      title: issue.title,
      company: sourceName,
      location:
        issue.labels
          ?.map((l) => l.name)
          .filter(Boolean)
          .slice(0, 3)
          .join(" • ") || "Brasil / Remoto",
      url: issue.html_url,
      publishedAt: issue.created_at,
    }));
}

async function scrapeTheMuse(): Promise<ScrapedJob[]> {
  const res = await fetchWithTimeout(
    "https://www.themuse.com/api/public/jobs?page=1"
  );
  const data = (await res.json()) as {
    results?: Array<{
      id: number;
      name: string;
      company?: { name?: string };
      locations?: Array<{ name?: string }>;
      refs?: { landing_page?: string };
      publication_date?: string;
    }>;
  };

  return (data.results ?? [])
    .filter((j) => j.name && j.refs?.landing_page)
    .map((job) => ({
      externalId: `themuse:${job.id}`,
      title: job.name,
      company: job.company?.name || "Empresa não informada",
      location:
        job.locations?.map((l) => l.name).filter(Boolean).join(", ") ||
        "Não informado",
      url: job.refs!.landing_page!,
      publishedAt: job.publication_date,
    }));
}

async function scrapeWorkingNomads(): Promise<ScrapedJob[]> {
  const res = await fetchWithTimeout(
    "https://www.workingnomads.com/api/exposed_jobs/"
  );
  const data = (await res.json()) as Array<{
    url: string;
    title: string;
    company_name?: string;
    location?: string;
    pub_date?: string;
  }>;

  return (data ?? []).slice(0, 50).map((job) => ({
    externalId: `wn:${makeHash(job.url)}`,
    title: job.title,
    company: job.company_name || "Empresa não informada",
    location: job.location || "Remoto",
    url: job.url,
    publishedAt: job.pub_date,
  }));
}

async function scrapeSmartRecruiters(target: string): Promise<ScrapedJob[]> {
  const slug = target
    .replace(/^https?:\/\/(jobs|careers)\.smartrecruiters\.com\//i, "")
    .replace(/\/.*$/, "")
    .trim();

  const res = await fetchWithTimeout(
    `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings?limit=50`
  );
  const data = (await res.json()) as {
    content?: Array<{
      id: string;
      name: string;
      company?: { name?: string };
      location?: {
        city?: string;
        region?: string;
        country?: string;
        remote?: boolean;
      };
      releasedDate?: string;
    }>;
  };

  return (data.content ?? [])
    .filter((job) => job.id && job.name)
    .map((job) => {
      const locParts = [job.location?.city, job.location?.region, job.location?.country]
        .filter(Boolean)
        .join(", ");
      const location = job.location?.remote
        ? locParts
          ? `${locParts} (Remoto)`
          : "Remoto"
        : locParts || "Não informado";

      return {
        externalId: `sr:${slug}:${job.id}`,
        title: job.name,
        company: job.company?.name || slug,
        location,
        url: `https://jobs.smartrecruiters.com/${encodeURIComponent(slug)}/${encodeURIComponent(job.id)}`,
        publishedAt: job.releasedDate,
      };
    });
}

async function scrapeRecruitee(target: string): Promise<ScrapedJob[]> {
  const slug = target
    .replace(/^https?:\/\//i, "")
    .replace(/\.recruitee\.com.*$/i, "")
    .replace(/\/.*$/, "")
    .trim();

  const res = await fetchWithTimeout(
    `https://${encodeURIComponent(slug)}.recruitee.com/api/offers/`
  );
  const data = (await res.json()) as {
    offers?: Array<{
      id: number | string;
      title: string;
      company_name?: string;
      location?: string;
      city?: string;
      country?: string;
      remote?: boolean;
      careers_url?: string;
      published_at?: string;
      created_at?: string;
    }>;
  };

  return (data.offers ?? [])
    .filter((job) => job.title)
    .map((job) => {
      const locParts = job.location || [job.city, job.country].filter(Boolean).join(", ");
      const location = job.remote
        ? locParts
          ? `${locParts} (Remoto)`
          : "Remoto"
        : locParts || "Não informado";

      return {
        externalId: `recruitee:${slug}:${job.id}`,
        title: job.title,
        company: job.company_name || slug,
        location,
        url: job.careers_url || `https://${encodeURIComponent(slug)}.recruitee.com/o/${job.id}`,
        publishedAt: job.published_at || job.created_at,
      };
    });
}

async function scrapeBreezy(target: string): Promise<ScrapedJob[]> {
  const slug = target
    .replace(/^https?:\/\//i, "")
    .replace(/\.breezy\.hr.*$/i, "")
    .replace(/\/.*$/, "")
    .trim();

  const res = await fetchWithTimeout(
    `https://${encodeURIComponent(slug)}.breezy.hr/json`
  );
  const data = (await res.json()) as Array<{
    id: string;
    name: string;
    company?: { name?: string };
    location?: {
      name?: string;
      city?: string;
      country?: { name?: string };
      is_remote?: boolean;
    };
    url: string;
    published_date?: string;
  }>;

  return (data ?? [])
    .filter((job) => job.name && job.url)
    .map((job) => {
      const locParts =
        job.location?.name ||
        [job.location?.city, job.location?.country?.name].filter(Boolean).join(", ");
      const location = job.location?.is_remote
        ? locParts
          ? `${locParts} (Remoto)`
          : "Remoto"
        : locParts || "Não informado";

      return {
        externalId: `breezy:${slug}:${job.id}`,
        title: job.name,
        company: job.company?.name || slug,
        location,
        url: job.url,
        publishedAt: job.published_date,
      };
    });
}

async function scrapeBambooHR(target: string): Promise<ScrapedJob[]> {
  const slug = target
    .replace(/^https?:\/\//i, "")
    .replace(/\.bamboohr\.com.*$/i, "")
    .replace(/\/.*$/, "")
    .trim();

  const res = await fetchWithTimeout(
    `https://${encodeURIComponent(slug)}.bamboohr.com/careers/list`
  );
  const data = (await res.json()) as {
    result?: Array<{
      id: string | number;
      jobOpeningName: string;
      location?: { city?: string; state?: string; country?: string };
      isRemote?: boolean | number | string | null;
      datePosted?: string;
    }>;
  };

  return (data.result ?? [])
    .filter((job) => job.id && job.jobOpeningName)
    .map((job) => {
      const locParts = [
        job.location?.city,
        job.location?.state,
        job.location?.country,
      ]
        .filter(Boolean)
        .join(", ");
      const isRemote =
        job.isRemote === true || job.isRemote === 1 || job.isRemote === "1";
      const location = isRemote
        ? locParts
          ? `${locParts} (Remoto)`
          : "Remoto"
        : locParts || "Não informado";

      return {
        externalId: `bamboo:${slug}:${job.id}`,
        title: job.jobOpeningName,
        company: slug,
        location,
        url: `https://${encodeURIComponent(slug)}.bamboohr.com/careers/${encodeURIComponent(String(job.id))}`,
        publishedAt: job.datePosted,
      };
    });
}

async function scrapePinpoint(target: string): Promise<ScrapedJob[]> {
  const slug = target
    .replace(/^https?:\/\//i, "")
    .replace(/\.pinpointhq\.com.*$/i, "")
    .replace(/\/.*$/, "")
    .trim();

  const res = await fetchWithTimeout(
    `https://${encodeURIComponent(slug)}.pinpointhq.com/postings.json`
  );
  const data = (await res.json()) as {
    data?: Array<{
      id: string | number;
      title: string;
      url: string;
      workplace_type?: string;
      workplace_type_text?: string;
      location?: { name?: string; city?: string; country?: string };
      created_at?: string;
    }>;
  };

  return (data.data ?? [])
    .filter((job) => job.title && job.url)
    .map((job) => {
      const baseLoc =
        job.location?.name ||
        [job.location?.city, job.location?.country].filter(Boolean).join(", ") ||
        job.workplace_type_text ||
        job.workplace_type ||
        "Não informado";
      const isRemote = job.workplace_type === "remote";
      const location =
        isRemote && !/remot/i.test(baseLoc) ? `${baseLoc} (Remoto)` : baseLoc;

      return {
        externalId: `pinpoint:${slug}:${job.id}`,
        title: job.title,
        company: slug,
        location,
        url: job.url,
        publishedAt: job.created_at,
      };
    });
}

async function scrapePersonio(target: string): Promise<ScrapedJob[]> {
  const slug = target
    .replace(/^https?:\/\//i, "")
    .replace(/\.jobs\.personio\.(de|com).*$/i, "")
    .replace(/\/.*$/, "")
    .trim();

  const res = await fetchWithTimeout(
    `https://${encodeURIComponent(slug)}.jobs.personio.de/xml`
  );
  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const jobs: ScrapedJob[] = [];

  $("position").each((_, el) => {
    const id = $(el).find("id").first().text().trim();
    const title = $(el).find("name").first().text().trim();
    const office = $(el).find("office").first().text().trim();
    const createdAt = $(el).find("createdAt").first().text().trim();
    if (!id || !title) return;

    jobs.push({
      externalId: `personio:${slug}:${id}`,
      title,
      company: slug,
      location: office || "Não informado",
      url: `https://${encodeURIComponent(slug)}.jobs.personio.de/job/${encodeURIComponent(id)}`,
      publishedAt: createdAt || undefined,
    });
  });

  return jobs;
}

export async function runSourceConnector(source: SourceRecord): Promise<ScrapedJob[]> {
  switch (source.type) {
    case "remotive":
      return scrapeRemotive();
    case "arbeitnow":
      return scrapeArbeitnow();
    case "remoteok":
      return scrapeRemoteOK();
    case "jobicy":
      return scrapeJobicy();
    case "himalayas":
      return scrapeHimalayas();
    case "themuse":
      return scrapeTheMuse();
    case "workingnomads":
      return scrapeWorkingNomads();
    case "greenhouse":
      return scrapeGreenhouse(source.target);
    case "lever":
      return scrapeLever(source.target);
    case "ashby":
      return scrapeAshby(source.target);
    case "workable":
      return scrapeWorkable(source.target);
    case "smartrecruiters":
      return scrapeSmartRecruiters(source.target);
    case "recruitee":
      return scrapeRecruitee(source.target);
    case "breezy":
      return scrapeBreezy(source.target);
    case "bamboohr":
      return scrapeBambooHR(source.target);
    case "pinpoint":
      return scrapePinpoint(source.target);
    case "personio":
      return scrapePersonio(source.target);
    case "gupy":
      return scrapeGupy(source.target);
    case "github_issues":
      return scrapeGithubIssues(source.target, source.name);
    case "rss":
      return scrapeRss(source.target, source.name);
    case "html":
      return scrapeHtml(source.target, source.name, source.selector);
    default:
      throw new Error(`Tipo de fonte não suportado: ${source.type}`);
  }
}

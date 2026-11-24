import type { SourceType } from "./scrapers/types";

export interface DefaultSourceDef {
  name: string;
  type: SourceType;
  target: string;
}

export const DEFAULT_SOURCES: DefaultSourceDef[] = [
  // APIs Globais Públicas
  { name: "Remotive (Vagas Remotas)", type: "remotive", target: "all" },
  { name: "Arbeitnow (Tech & Remoto)", type: "arbeitnow", target: "all" },
  { name: "RemoteOK (Global Remoto)", type: "remoteok", target: "all" },
  { name: "Jobicy (Remoto Internacional)", type: "jobicy", target: "all" },
  { name: "Himalayas (Tech Remoto)", type: "himalayas", target: "all" },
  { name: "The Muse (Tech & Produto)", type: "themuse", target: "all" },
  { name: "Working Nomads (Remote)", type: "workingnomads", target: "all" },

  // Feeds RSS Confiáveis
  { name: "WeWorkRemotely (Geral RSS)", type: "rss", target: "https://weworkremotely.com/remote-jobs.rss" },
  { name: "WeWorkRemotely (Programação)", type: "rss", target: "https://weworkremotely.com/categories/remote-programming-jobs.rss" },
  { name: "WeWorkRemotely (Design)", type: "rss", target: "https://weworkremotely.com/categories/remote-design-jobs.rss" },
  { name: "WeWorkRemotely (DevOps/Sysadmin)", type: "rss", target: "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss" },
  { name: "WeWorkRemotely (Produto)", type: "rss", target: "https://weworkremotely.com/categories/remote-product-jobs.rss" },
  { name: "Jobspresso (Remote RSS)", type: "rss", target: "https://jobspresso.co/feed/" },
  { name: "Himalayas (Remote RSS)", type: "rss", target: "https://himalayas.app/jobs/rss" },

  // GitHub Vagas Brasil (Issues Oficiais)
  { name: "FrontendBR (GitHub Vagas)", type: "github_issues", target: "frontendbr/vagas" },
  { name: "BackendBR (GitHub Vagas)", type: "github_issues", target: "backend-br/vagas" },
  { name: "React Brasil (GitHub Vagas)", type: "github_issues", target: "react-brasil/vagas" },
  { name: "QA Brasil (GitHub Vagas)", type: "github_issues", target: "qa-brasil/vagas" },
  { name: "Vue.js Brasil (GitHub Vagas)", type: "github_issues", target: "vuejs-br/vagas" },
  { name: "PHP Brasil (GitHub Vagas)", type: "github_issues", target: "phpdevbr/vagas" },
  { name: "Android Dev BR (GitHub Vagas)", type: "github_issues", target: "androiddevbr/vagas" },
  { name: "iOS / CocoaHeads BR (GitHub)", type: "github_issues", target: "CocoaHeadsBrasil/vagas" },
  { name: "SouJava (GitHub Vagas)", type: "github_issues", target: "soujava/vagas-java" },
  { name: ".NET Dev BR (GitHub Vagas)", type: "github_issues", target: "dotnetdevbr/vagas" },

  // Grandes Empresas Brasileiras (Gupy)
  { name: "iFood (Gupy)", type: "gupy", target: "ifood" },
  { name: "Stone (Gupy)", type: "gupy", target: "stone" },
  { name: "PicPay (Gupy)", type: "gupy", target: "picpay" },
  { name: "Ambev Tech (Gupy)", type: "gupy", target: "ambevtech" },
  { name: "Grupo Boticário (Gupy)", type: "gupy", target: "grupoboticario" },
  { name: "TOTVS (Gupy)", type: "gupy", target: "totvs" },
  { name: "XP Inc (Gupy)", type: "gupy", target: "xpinc" },
  { name: "Banco Inter (Gupy)", type: "gupy", target: "inter" },
  { name: "Locaweb (Gupy)", type: "gupy", target: "locaweb" },
  { name: "Magalu (Gupy)", type: "gupy", target: "magazineluiza" },
  { name: "Mercado Livre (Gupy)", type: "gupy", target: "mercadolivre" },
  { name: "Itaú Unibanco (Gupy)", type: "gupy", target: "itau" },
  { name: "BTG Pactual (Gupy)", type: "gupy", target: "btgpactual" },
  { name: "PagBank (Gupy)", type: "gupy", target: "pagbank" },
  { name: "C6 Bank (Gupy)", type: "gupy", target: "c6bank" },
  { name: "RD Station (Gupy)", type: "gupy", target: "rdstation" },
  { name: "Hotmart (Gupy)", type: "gupy", target: "hotmart" },
  { name: "QuintoAndar (Gupy)", type: "gupy", target: "quintoandar" },
  { name: "Creditas (Gupy)", type: "gupy", target: "creditas" },
  { name: "Globo (Gupy)", type: "gupy", target: "globo" },
  { name: "Sicoob (Gupy)", type: "gupy", target: "sicoob" },

  // Grandes Empresas Tech (APIs Oficiais Greenhouse / Lever / Ashby / SmartRecruiters)
  { name: "Nubank (Greenhouse)", type: "greenhouse", target: "nubank" },
  { name: "VTEX (Greenhouse)", type: "greenhouse", target: "vtex" },
  { name: "EBANX (Greenhouse)", type: "greenhouse", target: "ebanx" },
  { name: "Wellhub / Gympass (Greenhouse)", type: "greenhouse", target: "gympass" },
  { name: "Brex (Greenhouse)", type: "greenhouse", target: "brex" },
  { name: "Stripe (Greenhouse)", type: "greenhouse", target: "stripe" },
  { name: "Cloudflare (Greenhouse)", type: "greenhouse", target: "cloudflare" },
  { name: "GitLab (Greenhouse)", type: "greenhouse", target: "gitlab" },
  { name: "Datadog (Greenhouse)", type: "greenhouse", target: "datadog" },
  { name: "Discord (Greenhouse)", type: "greenhouse", target: "discord" },
  { name: "Figma (Greenhouse)", type: "greenhouse", target: "figma" },
  { name: "Vercel (Greenhouse)", type: "greenhouse", target: "vercel" },
  { name: "Dropbox (Greenhouse)", type: "greenhouse", target: "dropbox" },
  { name: "MongoDB (Greenhouse)", type: "greenhouse", target: "mongodb" },
  { name: "Twilio (Greenhouse)", type: "greenhouse", target: "twilio" },
  { name: "Elastic (Greenhouse)", type: "greenhouse", target: "elastic" },
  { name: "Netflix (Lever)", type: "lever", target: "netflix" },
  { name: "Notion (Ashby)", type: "ashby", target: "notion" },
  { name: "Linear (Ashby)", type: "ashby", target: "linear" },
  { name: "Deel (Ashby)", type: "ashby", target: "deel" },
  { name: "PostHog (Ashby)", type: "ashby", target: "posthog" },
  { name: "Vanta (Ashby)", type: "ashby", target: "vanta" },
  { name: "Visa (SmartRecruiters)", type: "smartrecruiters", target: "Visa" },
  { name: "Bosch (SmartRecruiters)", type: "smartrecruiters", target: "BoschGroup" },
  { name: "Ubisoft (SmartRecruiters)", type: "smartrecruiters", target: "Ubisoft" },
];

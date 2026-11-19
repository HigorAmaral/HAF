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

  // Grandes Empresas Tech (APIs Oficiais Greenhouse / Lever / Ashby)
  { name: "Nubank (Greenhouse)", type: "greenhouse", target: "nubank" },
  { name: "Stripe (Greenhouse)", type: "greenhouse", target: "stripe" },
  { name: "Cloudflare (Greenhouse)", type: "greenhouse", target: "cloudflare" },
  { name: "GitLab (Greenhouse)", type: "greenhouse", target: "gitlab" },
  { name: "Datadog (Greenhouse)", type: "greenhouse", target: "datadog" },
  { name: "Discord (Greenhouse)", type: "greenhouse", target: "discord" },
  { name: "Figma (Greenhouse)", type: "greenhouse", target: "figma" },
  { name: "Vercel (Greenhouse)", type: "greenhouse", target: "vercel" },
  { name: "Netflix (Lever)", type: "lever", target: "netflix" },
  { name: "Notion (Ashby)", type: "ashby", target: "notion" },
  { name: "Linear (Ashby)", type: "ashby", target: "linear" },
];

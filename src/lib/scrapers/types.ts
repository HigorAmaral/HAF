export type SourceType =
  | "remotive"
  | "arbeitnow"
  | "remoteok"
  | "jobicy"
  | "himalayas"
  | "themuse"
  | "workingnomads"
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workable"
  | "smartrecruiters"
  | "recruitee"
  | "breezy"
  | "bamboohr"
  | "pinpoint"
  | "personio"
  | "gupy"
  | "github_issues"
  | "rss"
  | "html";

export interface SourceRecord {
  id: number;
  name: string;
  type: SourceType;
  target: string;
  selector: string | null;
  enabled: boolean;
  last_checked_at: string | null;
  last_status: string | null;
  created_at: string;
}

export interface KeywordRecord {
  id: number;
  term: string;
  created_at: string;
}

export interface JobRecord {
  id: number;
  external_id: string;
  source_id: number | null;
  source_name: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  published_at: string | null;
  notified: boolean;
  saved?: boolean;
  applied?: boolean;
  application_stage?: string;
  notes?: string;
  created_at: string;
}

export interface ScrapeRunRecord {
  id: number;
  started_at: string;
  finished_at: string | null;
  jobs_found: number;
  new_jobs: number;
  status: string;
  error: string | null;
}

export interface ScrapedJob {
  externalId: string;
  title: string;
  company: string;
  location?: string;
  url: string;
  publishedAt?: string;
}

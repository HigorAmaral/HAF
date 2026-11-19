import { ensureSchema, getSql } from "../db";
import { notifyNewJobs, type NotificationResult } from "../notifications";
import { runSourceConnector } from "./connectors";
import type { JobRecord, KeywordRecord, SourceRecord } from "./types";

export interface RunMonitorResult {
  runId: number;
  sourcesChecked: number;
  jobsFound: number;
  newJobsCount: number;
  notifications: NotificationResult;
  errors: Array<{ source: string; message: string }>;
}

export async function runJobMonitor(): Promise<RunMonitorResult> {
  await ensureSchema();
  const sql = getSql();

  const runRows = await sql`
    INSERT INTO scrape_runs (status)
    VALUES ('running')
    RETURNING id
  `;
  const runId = runRows[0].id as number;

  try {
    const sources = (await sql`
      SELECT * FROM sources WHERE enabled = TRUE ORDER BY id ASC
    `) as SourceRecord[];

    const keywords = (await sql`
      SELECT * FROM keywords ORDER BY id ASC
    `) as KeywordRecord[];

    const normalizedTerms = keywords.map((k) => k.term.trim().toLowerCase()).filter(Boolean);

    const results = await Promise.allSettled(
      sources.map(async (source) => {
        try {
          const scraped = await runSourceConnector(source);
          await sql`
            UPDATE sources
            SET last_checked_at = NOW(), last_status = ${`OK (${scraped.length} vagas)`}
            WHERE id = ${source.id}
          `;
          return { source, scraped };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          await sql`
            UPDATE sources
            SET last_checked_at = NOW(), last_status = ${`Erro: ${msg.slice(0, 120)}`}
            WHERE id = ${source.id}
          `;
          throw { sourceName: source.name, message: msg };
        }
      })
    );

    const errors: Array<{ source: string; message: string }> = [];
    let totalFound = 0;
    const insertedJobs: JobRecord[] = [];

    for (const res of results) {
      if (res.status === "rejected") {
        const reason = res.reason as { sourceName?: string; message?: string };
        errors.push({
          source: reason?.sourceName || "Desconhecida",
          message: reason?.message || "Falha na coleta",
        });
        continue;
      }

      const { source, scraped } = res.value;
      const filtered =
        normalizedTerms.length === 0
          ? scraped
          : scraped.filter((job) => {
              const haystack = `${job.title} ${job.company} ${job.location || ""}`.toLowerCase();
              return normalizedTerms.some((term) => haystack.includes(term));
            });

      totalFound += filtered.length;

      for (const job of filtered) {
        const rows = (await sql`
          INSERT INTO jobs (external_id, source_id, source_name, title, company, location, url, published_at)
          VALUES (
            ${job.externalId},
            ${source.id},
            ${source.name},
            ${job.title},
            ${job.company},
            ${job.location || null},
            ${job.url},
            ${job.publishedAt || null}
          )
          ON CONFLICT (external_id) DO NOTHING
          RETURNING *
        `) as JobRecord[];

        if (rows.length > 0) {
          insertedJobs.push(rows[0]);
        }
      }
    }

    const notifications = await notifyNewJobs(insertedJobs);

    if (
      insertedJobs.length > 0 &&
      (notifications.telegram.sent || notifications.email.sent)
    ) {
      const ids = insertedJobs.map((j) => j.id);
      await sql`
        UPDATE jobs SET notified = TRUE WHERE id = ANY(${ids})
      `;
    }

    await sql`
      UPDATE scrape_runs
      SET finished_at = NOW(),
          jobs_found = ${totalFound},
          new_jobs = ${insertedJobs.length},
          status = ${errors.length > 0 ? "partial" : "success"},
          error = ${errors.length > 0 ? JSON.stringify(errors) : null}
      WHERE id = ${runId}
    `;

    return {
      runId,
      sourcesChecked: sources.length,
      jobsFound: totalFound,
      newJobsCount: insertedJobs.length,
      notifications,
      errors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro fatal no monitor";
    await sql`
      UPDATE scrape_runs
      SET finished_at = NOW(), status = 'error', error = ${msg}
      WHERE id = ${runId}
    `;
    throw err;
  }
}

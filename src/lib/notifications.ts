import { Resend } from "resend";
import type { JobRecord } from "./scrapers/types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface NotificationResult {
  telegram: { sent: boolean; reason?: string };
  email: { sent: boolean; reason?: string };
}

export async function sendTelegramAlert(
  jobs: JobRecord[],
  chatIdOverride?: string
): Promise<{ sent: boolean; reason?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = chatIdOverride?.trim() || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return {
      sent: false,
      reason: !token
        ? "TELEGRAM_BOT_TOKEN não configurado na Vercel"
        : "Informe seu Telegram Chat ID no painel",
    };
  }

  // Envia em lotes de até 8 vagas para respeitar o limite de 4096 caracteres do Telegram
  const batchSize = 8;
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const lines = batch.map(
      (job) =>
        `💼 <b>${escapeHtml(job.title)}</b>\n🏢 ${escapeHtml(job.company)} • 📍 ${escapeHtml(job.location || "Não informado")}\n🔗 <a href="${job.url}">Abrir vaga</a> <i>(${escapeHtml(job.source_name)})</i>`
    );

    const header =
      i === 0
        ? `🚀 <b>${jobs.length} nova(s) vaga(s) encontrada(s)!</b>\n\n`
        : "";
    const text = `${header}${lines.join("\n\n")}`;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Erro Telegram (${res.status}): ${errBody}`);
    }
  }

  return { sent: true };
}

export async function sendEmailAlert(
  jobs: JobRecord[],
  emailToOverride?: string
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = emailToOverride?.trim() || process.env.ALERT_EMAIL_TO;
  const from =
    process.env.ALERT_EMAIL_FROM || "HAF Monitor <onboarding@resend.dev>";

  if (!apiKey || !to) {
    return {
      sent: false,
      reason: !apiKey
        ? "RESEND_API_KEY não configurada na Vercel"
        : "Informe o e-mail de destino no painel",
    };
  }

  const resend = new Resend(apiKey);
  const itemsHtml = jobs
    .map(
      (job) => `
      <li style="margin-bottom:16px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;list-style:none;">
        <div style="font-size:16px;font-weight:600;color:#111827;">${escapeHtml(job.title)}</div>
        <div style="font-size:14px;color:#4b5563;margin:4px 0;">
          ${escapeHtml(job.company)} • ${escapeHtml(job.location || "Não informado")} • <em>${escapeHtml(job.source_name)}</em>
        </div>
        <a href="${job.url}" style="display:inline-block;margin-top:6px;color:#2563eb;text-decoration:none;font-weight:500;">
          Ver vaga →
        </a>
      </li>`
    )
    .join("");

  const { error } = await resend.emails.send({
    from,
    to: to.split(",").map((e) => e.trim()),
    subject: `🚀 ${jobs.length} nova(s) vaga(s) encontrada(s) — HAF`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:16px;">
        <h2 style="color:#111827;">HAF — Novas vagas encontradas (${jobs.length})</h2>
        <ul style="padding:0;margin:16px 0;">${itemsHtml}</ul>
        <p style="font-size:12px;color:#6b7280;">Enviado automaticamente pelo HAF Monitor de Vagas na Vercel.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Erro Resend: ${error.message}`);
  }

  return { sent: true };
}

export async function notifyNewJobs(
  jobs: JobRecord[],
  overrides?: { alertEmail?: string; telegramChatId?: string }
): Promise<NotificationResult> {
  if (jobs.length === 0) {
    return {
      telegram: { sent: false, reason: "Nenhuma vaga nova" },
      email: { sent: false, reason: "Nenhuma vaga nova" },
    };
  }

  const [tgRes, emailRes] = await Promise.allSettled([
    sendTelegramAlert(jobs, overrides?.telegramChatId),
    sendEmailAlert(jobs, overrides?.alertEmail),
  ]);

  return {
    telegram:
      tgRes.status === "fulfilled"
        ? tgRes.value
        : { sent: false, reason: tgRes.reason?.message || "Erro no Telegram" },
    email:
      emailRes.status === "fulfilled"
        ? emailRes.value
        : { sent: false, reason: emailRes.reason?.message || "Erro no E-mail" },
  };
}

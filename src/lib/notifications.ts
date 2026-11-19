import { Resend } from "resend";
import type { JobRecord } from "./scrapers/types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

  const batchSize = 8;
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const lines = batch.map(
      (job) =>
        `💼 <b>${escapeHtml(job.title)}</b>\n🏢 ${escapeHtml(job.company)} • 📍 ${escapeHtml(job.location || "Não informado")}\n🔗 <a href="${job.url}">Abrir vaga</a> <i>(${escapeHtml(job.source_name)})</i>`
    );

    const header =
      i === 0
        ? `🚀 <b>HAF — ${jobs.length} nova(s) vaga(s) encontrada(s)!</b>\n\n`
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
      <tr>
        <td style="padding:0 0 14px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;border:1px solid #1e293b;border-radius:12px;">
            <tr>
              <td style="padding:18px 20px;">
                <span style="display:inline-block;background-color:#312e81;color:#c7d2fe;font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:0.4px;">
                  ${escapeHtml(job.source_name)}
                </span>
                <div style="margin:10px 0 6px 0;font-size:17px;font-weight:700;color:#f8fafc;line-height:1.35;">
                  ${escapeHtml(job.title)}
                </div>
                <div style="font-size:13px;color:#94a3b8;margin-bottom:14px;">
                  🏢 ${escapeHtml(job.company)} &nbsp;•&nbsp; 📍 ${escapeHtml(job.location || "Não informado")}
                </div>
                <a href="${escapeHtml(job.url)}" target="_blank" style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:9px 16px;border-radius:8px;">
                  Ver vaga →
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");

  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
    <body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#020617;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:#090d16;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5,#0ea5e9);padding:26px 24px;">
                  <div style="font-size:12px;font-weight:700;color:#e0e7ff;letter-spacing:1.2px;text-transform:uppercase;">
                    HAF • Monitor de Vagas
                  </div>
                  <h1 style="margin:6px 0 0 0;font-size:22px;font-weight:800;color:#ffffff;">
                    🚀 ${jobs.length} nova(s) vaga(s) encontrada(s)!
                  </h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:22px 24px 10px 24px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    ${itemsHtml}
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:16px 24px 24px 24px;border-top:1px solid #1e293b;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">
                    Enviado automaticamente pelo <strong>HAF</strong> conforme seu currículo, palavras-chave e filtros de localização.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  const { error } = await resend.emails.send({
    from,
    to: to.split(",").map((e) => e.trim()),
    subject: `🚀 ${jobs.length} nova(s) vaga(s) encontrada(s) — HAF`,
    html,
  });

  if (error) {
    throw new Error(`Erro Resend: ${error.message}`);
  }

  return { sent: true };
}

export async function sendPasswordResetEmail(
  toEmail: string,
  userName: string,
  resetUrl: string
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.ALERT_EMAIL_FROM || "HAF Monitor <onboarding@resend.dev>";

  if (!apiKey) {
    return {
      sent: false,
      reason: "RESEND_API_KEY não configurada na Vercel",
    };
  }

  const resend = new Resend(apiKey);
  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
    <body style="margin:0;padding:0;background-color:#020617;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#020617;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5,#6366f1);padding:24px;">
                  <div style="font-size:12px;font-weight:700;color:#e0e7ff;letter-spacing:1px;text-transform:uppercase;">
                    HAF • Segurança da Conta
                  </div>
                  <h1 style="margin:6px 0 0 0;font-size:20px;font-weight:800;color:#ffffff;">
                    Recuperação de Senha
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding:24px;color:#cbd5e1;font-size:14px;line-height:1.6;">
                  <p style="margin:0 0 12px 0;">Olá, <strong>${escapeHtml(userName)}</strong>!</p>
                  <p style="margin:0 0 20px 0;">
                    Recebemos uma solicitação para redefinir a senha da sua conta no <strong>HAF</strong>. Clique no botão abaixo para criar uma nova senha (o link expira em 1 hora):
                  </p>
                  <p style="margin:0 0 20px 0;text-align:center;">
                    <a href="${escapeHtml(resetUrl)}" target="_blank" style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">
                      Redefinir Minha Senha
                    </a>
                  </p>
                  <p style="margin:0;font-size:12px;color:#64748b;">
                    Se você não solicitou essa alteração, ignore este e-mail com segurança.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  const { error } = await resend.emails.send({
    from,
    to: [toEmail],
    subject: "🔐 Recuperação de Senha — HAF Monitor de Vagas",
    html,
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

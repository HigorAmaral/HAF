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
        `• <b>${escapeHtml(job.title)}</b>\n${escapeHtml(job.company)} — ${escapeHtml(job.location || "Não informado")}\n<a href="${job.url}">Abrir vaga</a> (${escapeHtml(job.source_name)})`
    );

    const header =
      i === 0
        ? `<b>HAF — ${jobs.length} nova(s) vaga(s) encontrada(s)</b>\n\n`
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
      (job, idx) => `
      <tr>
        <td style="padding:18px 0;${idx < jobs.length - 1 ? "border-bottom:1px solid #e5e7eb;" : ""}">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="vertical-align:top;">
                <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">
                  ${escapeHtml(job.source_name)}
                </div>
                <a href="${escapeHtml(job.url)}" target="_blank" style="font-size:15px;font-weight:600;color:#111827;text-decoration:none;line-height:1.4;display:inline-block;">
                  ${escapeHtml(job.title)}
                </a>
                <div style="font-size:13px;color:#4b5563;margin-top:4px;">
                  ${escapeHtml(job.company)} &middot; ${escapeHtml(job.location || "Local não informado")}
                </div>
              </td>
              <td style="vertical-align:middle;text-align:right;padding-left:16px;white-space:nowrap;">
                <a href="${escapeHtml(job.url)}" target="_blank" style="display:inline-block;background-color:#111827;color:#ffffff;font-size:12px;font-weight:500;text-decoration:none;padding:8px 14px;border-radius:6px;">
                  Ver vaga
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
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:8px;">
              <tr>
                <td style="padding:24px 28px 18px 28px;border-bottom:1px solid #e4e4e7;">
                  <div style="font-size:12px;font-weight:700;color:#111827;letter-spacing:0.8px;text-transform:uppercase;">
                    HAF
                  </div>
                  <h1 style="margin:8px 0 4px 0;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">
                    ${jobs.length} nova(s) vaga(s) para o seu perfil
                  </h1>
                  <p style="margin:0;font-size:13px;color:#6b7280;">
                    Selecionadas automaticamente com base no seu currículo e filtros.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 28px 8px 28px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    ${itemsHtml}
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 28px;background-color:#fafafa;border-top:1px solid #e4e4e7;border-radius:0 0 8px 8px;">
                  <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                    Você recebeu este resumo porque cadastrou seu e-mail no HAF Monitor de Vagas.
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
    subject: `HAF: ${jobs.length} nova(s) vaga(s) encontrada(s)`,
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
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:8px;">
              <tr>
                <td style="padding:24px 28px 16px 28px;border-bottom:1px solid #e4e4e7;">
                  <div style="font-size:12px;font-weight:700;color:#111827;letter-spacing:0.8px;text-transform:uppercase;">
                    HAF
                  </div>
                  <h1 style="margin:8px 0 0 0;font-size:19px;font-weight:700;color:#111827;">
                    Redefinição de senha
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 28px;font-size:14px;color:#374151;line-height:1.6;">
                  <p style="margin:0 0 12px 0;">Olá, ${escapeHtml(userName)}.</p>
                  <p style="margin:0 0 20px 0;">
                    Recebemos um pedido para alterar a senha da sua conta. Use o botão abaixo para definir uma nova senha (válido por 1 hora):
                  </p>
                  <p style="margin:0 0 20px 0;">
                    <a href="${escapeHtml(resetUrl)}" target="_blank" style="display:inline-block;background-color:#111827;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:6px;">
                      Redefinir senha
                    </a>
                  </p>
                  <p style="margin:0;font-size:12px;color:#6b7280;">
                    Se você não fez essa solicitação, pode ignorar este e-mail.
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
    subject: "HAF: Redefinição de senha",
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

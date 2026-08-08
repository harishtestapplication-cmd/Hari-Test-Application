import { ITest } from "@/models/Test";
import { IAttempt } from "@/models/Attempt";

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

interface SendEmailInput {
  to: string;
  subject: string;
  htmlContent: string;
  attachment?: { name: string; base64: string };
}

async function sendEmail({ to, subject, htmlContent, attachment }: SendEmailInput): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "HariTestPlatform";

  if (!apiKey || !senderEmail) {
    throw new Error("Brevo is not configured (missing BREVO_API_KEY or BREVO_SENDER_EMAIL)");
  }

  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName },
      to: [{ email: to }],
      subject,
      htmlContent,
      ...(attachment
        ? { attachment: [{ name: attachment.name, content: attachment.base64 }] }
        : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo error ${res.status}: ${body}`);
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  time_expired: "Time expired",
  test_expired: "Test window closed",
};

function buildStudentResultHtml(test: ITest, attempt: IAttempt): string {
  const name = attempt.studentName ? escapeHtml(attempt.studentName) : "there";
  const statusLabel = STATUS_LABELS[attempt.status] ?? "Submitted";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="margin-bottom: 4px;">${escapeHtml(test.title)}</h2>
      <p style="color: #666; margin-top: 0;">${statusLabel}</p>
      <p>Hi ${name},</p>
      <p>Your result:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #666;">Score</td><td style="padding: 6px 0; font-weight: bold;">${attempt.correctAnswers} / ${attempt.totalQuestions}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Percentage</td><td style="padding: 6px 0; font-weight: bold;">${attempt.percentage}%</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Correct</td><td style="padding: 6px 0;">${attempt.correctAnswers}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Wrong</td><td style="padding: 6px 0;">${attempt.wrongAnswers}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Unanswered</td><td style="padding: 6px 0;">${attempt.unanswered}</td></tr>
      </table>
      <p style="color: #999; font-size: 12px;">This is an automated message from HariTestPlatform.</p>
    </div>
  `;
}

/**
 * Fire-and-forget by design: callers never throw the app off course because
 * of an email failure. Returns whether the send succeeded so the caller can
 * persist resultEmailSent accurately.
 */
export async function sendStudentResultEmail(test: ITest, attempt: IAttempt): Promise<boolean> {
  try {
    await sendEmail({
      to: attempt.studentEmail,
      subject: `Your result for ${test.title}`,
      htmlContent: buildStudentResultHtml(test, attempt),
    });
    return true;
  } catch (err) {
    console.error("sendStudentResultEmail failed:", err);
    return false;
  }
}

export interface AdminReportStats {
  totalAttempts: number;
  completed: number;
  expired: number;
  averagePercentage: number;
  highPercentage: number;
  lowPercentage: number;
}

function buildAdminReportHtml(test: ITest, stats: AdminReportStats): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="margin-bottom: 4px;">${escapeHtml(test.title)} — Final Report</h2>
      <p style="color: #666; margin-top: 0;">Test window closed. Full results attached as an Excel file.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #666;">Total attempts</td><td style="padding: 6px 0; font-weight: bold;">${stats.totalAttempts}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Completed</td><td style="padding: 6px 0;">${stats.completed}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Expired (no manual submit)</td><td style="padding: 6px 0;">${stats.expired}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Average</td><td style="padding: 6px 0;">${stats.averagePercentage}%</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Highest</td><td style="padding: 6px 0;">${stats.highPercentage}%</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Lowest</td><td style="padding: 6px 0;">${stats.lowPercentage}%</td></tr>
      </table>
      <p style="color: #999; font-size: 12px;">This is an automated message from HariTestPlatform.</p>
    </div>
  `;
}

/**
 * Used by both the admin's on-demand Excel download flow (if it ever emails
 * a copy) and Phase 13's cron finalize job — same function, one source of
 * truth for what the admin report email looks like.
 */
export async function sendAdminFinalReportEmail(
  test: ITest,
  stats: AdminReportStats,
  xlsxBuffer: Buffer
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error("sendAdminFinalReportEmail failed: ADMIN_EMAIL is not configured");
    return false;
  }

  try {
    await sendEmail({
      to: adminEmail,
      subject: `Final report: ${test.title}`,
      htmlContent: buildAdminReportHtml(test, stats),
      attachment: {
        name: `${test.testCode}-results.xlsx`,
        base64: xlsxBuffer.toString("base64"),
      },
    });
    return true;
  } catch (err) {
    console.error("sendAdminFinalReportEmail failed:", err);
    return false;
  }
}
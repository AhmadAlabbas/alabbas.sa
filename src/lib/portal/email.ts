import "server-only";
import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { portalConfig } from "./config";
import { decrypt, encrypt } from "./crypto";
export async function queueEmail(
  tx: Prisma.TransactionClient,
  to: string,
  url: string,
  purpose: string,
  locale: string,
) {
  const id = randomUUID().replace(/-/g, "").slice(0, 30);
  const ar = locale === "ar";
  const subject =
    purpose === "VERIFY_EMAIL"
      ? ar
        ? "تأكيد بريدك الإلكتروني لدى العباس"
        : "Verify your Alabbas email"
      : ar
        ? "إعادة تعيين كلمة المرور لدى العباس"
        : "Reset your Alabbas password";
  const text = ar
    ? `استخدم الرابط التالي لإكمال طلبك. إذا لم تطلب ذلك، تجاهل هذه الرسالة.\n\n${url}\n\nينتهي الرابط خلال ${purpose === "VERIFY_EMAIL" ? "٢٤ ساعة" : "٣٠ دقيقة"}.`
    : `Use this link to complete your request. If you did not request this, ignore this message.\n\n${url}\n\nThis link expires in ${purpose === "VERIFY_EMAIL" ? "24 hours" : "30 minutes"}.`;
  await tx.emailJob.create({
    data: {
      id,
      payload: encrypt(JSON.stringify({ to, subject, text }), `email:${id}`),
    },
  });
}
export async function runMaintenance() {
  const config = portalConfig();
  const client = db();
  const now = new Date();
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await client.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        {
          kind: "AUTHENTICATED",
          lastSeenAt: { lt: new Date(Date.now() - 15 * 60 * 1000) },
        },
      ],
    },
  });
  await client.actionToken.deleteMany({ where: { expiresAt: { lt: now } } });
  await client.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } });
  await client.auditEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  await client.emailJob.deleteMany({
    where: {
      OR: [
        { sentAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        { createdAt: { lt: cutoff } },
      ],
    },
  });
  const jobs = await client.emailJob.findMany({
    where: {
      sentAt: null,
      nextAttemptAt: { lte: now },
      attempts: { lt: 5 },
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
    },
    take: 5,
    orderBy: { createdAt: "asc" },
  });
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    requireTLS: true,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 5000,
    socketTimeout: 5000,
  });
  let sent = 0;
  let failed = 0;
  const deadline = Date.now() + 20_000;
  for (const job of jobs) {
    if (Date.now() >= deadline) break;
    const claim = await client.emailJob.updateMany({
      where: {
        id: job.id,
        sentAt: null,
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
      data: {
        lockedUntil: new Date(Date.now() + 60 * 1000),
        attempts: { increment: 1 },
      },
    });
    if (claim.count !== 1) continue;
    try {
      const data = JSON.parse(decrypt(job.payload, `email:${job.id}`)) as {
        to: string;
        subject: string;
        text: string;
      };
      const result = await transport.sendMail({
        ...data,
        from: config.SMTP_FROM,
        messageId: `<${job.id}@${new URL(config.SITE_URL).hostname}>`,
      });
      if (!result.accepted?.length) throw new Error("Delivery failed");
      await client.emailJob.update({
        where: { id: job.id },
        data: { sentAt: new Date(), payload: "", lockedUntil: null },
      });
      sent++;
    } catch {
      await client.emailJob.update({
        where: { id: job.id },
        data: {
          lockedUntil: null,
          nextAttemptAt: new Date(
            Date.now() +
              Math.min(60 * 60 * 1000, 2 ** (job.attempts + 1) * 60 * 1000),
          ),
        },
      });
      failed++;
    }
  }
  return { sent, failed };
}

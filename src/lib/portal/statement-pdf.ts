import "server-only";
import PDFDocument from "pdfkit";
import path from "node:path";
import type { Locale } from "@/content/site";
import { capabilities, copy } from "@/content/site";
import { dashboardCopy } from "@/content/dashboard";
import { sampleStatement } from "./dashboard-model";

export async function renderSampleStatement(month: string, locale: Locale) {
  const statement = sampleStatement(month);
  if (!statement) throw new Error("Unknown sample statement");
  const c = dashboardCopy[locale],
    ar = locale === "ar";
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      autoFirstPage: true,
      info: {
        Title: c.pdf.title,
        Author: "Alabbas",
        Subject: "Fictional sample only; not a client record",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.registerFont(
      "Inter",
      path.join(
        process.cwd(),
        "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
      ),
    );
    doc.registerFont(
      "Arabic",
      path.join(
        process.cwd(),
        "src/lib/portal/pdf-assets/IBMPlexSansArabic-Regular.ttf",
      ),
    );
    // Explicit features shape each complete Arabic line, bypassing PDFKit's per-word layout cache.
    const options = {
      features: ["rlig" as const, "liga" as const, "calt" as const],
      lineBreak: false,
      align: ar ? ("right" as const) : ("left" as const),
      width: 499,
    };
    function label(
      text: string,
      y: number,
      size = 11,
      color = "#101711",
      x = 48,
      width = 499,
    ) {
      doc
        .font(ar ? "Arabic" : "Inter")
        .fontSize(size)
        .fillColor(color)
        .text(text, x, y, { ...options, width });
    }
    function paragraph(text: string, y: number, size = 10) {
      doc.font(ar ? "Arabic" : "Inter").fontSize(size);
      let line = "";
      for (const word of text.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (
          line &&
          doc.widthOfString(next, { features: options.features }) > 499
        ) {
          label(line, y, size);
          y += 18;
          line = word;
        } else line = next;
      }
      if (line) {
        label(line, y, size);
        y += 18;
      }
      return y;
    }
    function row(text: string, value: string, y: number) {
      label(text, y, 10, "#101711", ar ? 310 : 48, 237);
      doc
        .font("Inter")
        .fontSize(10)
        .fillColor("#101711")
        .text(value, ar ? 48 : 310, y, {
          width: 237,
          lineBreak: false,
          align: ar ? "left" : "right",
        });
    }
    const money = (cents: number) =>
      new Intl.NumberFormat("en-SA", {
        style: "currency",
        currency: "SAR",
        currencyDisplay: "code",
      }).format(cents / 100);
    doc.rect(0, 0, 595.28, 126).fill("#101711");
    doc
      .font("Inter")
      .fontSize(18)
      .fillColor("#ffffff")
      .text("ALABBAS", 48, 28, { lineBreak: false });
    label(c.pdf.title, 68, 22, "#ffffff");
    label(c.pdf.reference, 101, 10, "#ffffff");
    label(c.pdf.notice, 151, 13, "#75633d");
    let y = paragraph(c.pdf.financialNotice, 182, 10) + 16;
    row(c.pdf.period, `${statement.start} / ${statement.end}`, y);
    y += 31;
    row(c.pdf.first, money(statement.openingCents), y);
    y += 25;
    row(c.pdf.last, money(statement.closingCents), y);
    y += 25;
    row(c.cash, money(statement.cashCents), y);
    y += 42;
    doc
      .moveTo(48, y - 12)
      .lineTo(547, y - 12)
      .strokeColor("#dddcd5")
      .stroke();
    label(c.holdings, y, 16);
    y += 36;
    for (const holding of statement.holdings) {
      row(
        capabilities.find((v) => v.slug === holding.category)![locale],
        money(holding.valueCents),
        y,
      );
      y += 27;
    }
    y += 21;
    doc
      .moveTo(48, y - 9)
      .lineTo(547, y - 9)
      .strokeColor("#dddcd5")
      .stroke();
    y = paragraph(c.pdf.help, y, 10) + 12;
    y = paragraph(copy[locale].risk, y, 10) + 16;
    label(c.pdf.footer, y, 9, "#75633d");
    doc.end();
  });
}

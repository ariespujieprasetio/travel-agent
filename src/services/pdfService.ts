import PDFDocument from "pdfkit";
import prisma from "../models/prisma";
import path from "path";

/* ================= TEXT CLEANING ================= */

function fixBrokenEncoding(text: string): string {
  return text
    .replace(/Ø=Ü/g, "-")
    .replace(/Ø=ù/g, "-")
    .replace(/Ø=Û/g, "-")
    .replace(/â€¢/g, "-")
    .replace(/â€“/g, "-")
    .replace(/â€”/g, "-")
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/Â/g, "");
}

function cleanText(text: string): string {
  return fixBrokenEncoding(text)
    .replace(/☔/g, "(Umbrella recommended)")
    .replace(/📍/g, "Location:")
    .replace(/💰/g, "Price:")
    .replace(/•/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-");
}

/* ================= COST PARSER ================= */

function parseCost(val?: string | null): number {
  if (!val) return 0;
  const num = val.replace(/[^\d]/g, "");
  return num ? parseInt(num, 10) : 0;
}

/* ================= TABLE DRAW HELPER ================= */

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  startY: number
) {
  const columnWidth = (doc.page.width - 80) / headers.length;
  let y = startY;

  doc.font("NotoSans-Bold").fontSize(11);

  headers.forEach((h, i) => {
    doc.rect(40 + i * columnWidth, y, columnWidth, 20).fillAndStroke("#9933FF", "#000");
    doc.fillColor("#FFFFFF").text(h, 45 + i * columnWidth, y + 5, { width: columnWidth - 10 });
  });

  y += 20;
  doc.font("NotoSans").fillColor("#000000");

  rows.forEach((row) => {
    row.forEach((cell, i) => {
      doc.rect(40 + i * columnWidth, y, columnWidth, 20).stroke();
      doc.text(cell, 45 + i * columnWidth, y + 5, { width: columnWidth - 10 });
    });
    y += 20;
  });

  return y;
}

/* ================= MAIN PDF FUNCTION ================= */

export async function generateItineraryPDF(sessionId: string): Promise<Buffer> {
  const itinerary = await prisma.tripItinerary.findMany({
    where: { sessionId },
    orderBy: [{ dayNumber: "asc" }, { time: "asc" }],
  });

  const context = await prisma.tripContext.findUnique({
    where: { sessionId },
  });

  if (!itinerary.length) throw new Error("No itinerary found");

  const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });

  doc.registerFont("NotoSans", path.join(process.cwd(), "fonts/NotoSans-Regular.ttf"));
  doc.registerFont("NotoSans-Bold", path.join(process.cwd(), "fonts/NotoSans-Bold.ttf"));
  doc.font("NotoSans");

  const buffers: Uint8Array[] = [];
  doc.on("data", buffers.push.bind(buffers));

  /* ===== HEADER ===== */
  doc.rect(0, 0, doc.page.width, 40).fill("#9933FF");
  doc.fillColor("#FFFFFF")
     .font("NotoSans-Bold")
     .fontSize(18)
     .text("TRAVEL ITINERARY", 0, 12, { align: "center" });

  doc.moveDown(2).fillColor("#000000");

  /* ===== INFO DETAIL ===== */
  const weather = context?.weatherJson as any;
  const infoRows = [
    ["City", weather?.location?.city || "-"],
    ["Condition", weather?.current?.description || "-"],
    ["Temperature", weather?.current?.temperature_c + "°C" || "-"],
  ];

  doc.font("NotoSans-Bold").text("Information Detail");
  drawTable(doc, ["Item", "Details"], infoRows, doc.y + 10);

  /* ===== GROUP ITINERARY PER DAY ===== */
  const grouped: Record<number, typeof itinerary> = {};
  itinerary.forEach((item) => {
    if (!grouped[item.dayNumber]) grouped[item.dayNumber] = [];
    grouped[item.dayNumber].push(item);
  });

  Object.keys(grouped).forEach((day) => {
    doc.addPage();
    doc.font("NotoSans-Bold").fontSize(16).text(`Day ${day}`, { underline: true });
    doc.moveDown();

    const rows = grouped[Number(day)].map((it) => {
      const detailsParts = [];
      if (it.description) detailsParts.push(cleanText(it.description));
      if (it.location) detailsParts.push("Location: " + cleanText(it.location));

      return [
        it.time || "-",
        cleanText(it.title),
        detailsParts.join("\n") || "-",
        it.price ? cleanText(it.price) : "-"
      ];
    });

    drawTable(doc, ["Time", "Activity", "Details", "Cost"], rows, doc.y + 10);
  });

  /* ===== BUDGET SUMMARY ===== */
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 40).fill("#9933FF");
  doc.fillColor("#FFFFFF")
     .font("NotoSans-Bold")
     .fontSize(18)
     .text("BUDGET SUMMARY", 0, 12, { align: "center" });

  doc.moveDown(2).fillColor("#000000");

  let total = 0;
  const dayTotals: Record<string, number> = {};

  Object.keys(grouped).forEach((day) => {
    grouped[Number(day)].forEach((it) => {
      const cost = parseCost(it.price);
      total += cost;
      dayTotals[day] = (dayTotals[day] || 0) + cost;
    });
  });

  const budgetRows = [
    ["Total Estimated Cost", `$${total.toLocaleString()}`],
    ["Daily Average", `$${Math.round(total / Object.keys(grouped).length).toLocaleString()}`],
  ];

  Object.keys(dayTotals).forEach((day) => {
    budgetRows.push([`Day ${day} Total`, `$${dayTotals[day].toLocaleString()}`]);
  });

  drawTable(doc, ["Category", "Amount"], budgetRows, doc.y + 10);

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
  });
}

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

function formatCurrency(amount: number, currency: string) {
  const symbolMap: any = {
    JPY: "¥",
    USD: "$",
    IDR: "Rp",
  };

  return `${symbolMap[currency] ?? ""}${amount.toLocaleString()} ${currency}`;
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

function parseCost(val?: string | null): {
  amount: number;
  currency: string | null;
} {
  if (!val) return { amount: 0, currency: null };

  if (/free|included|-/i.test(val)) return { amount: 0, currency: null };

  const amount = parseInt(val.replace(/[^\d]/g, "")) || 0;

  if (/JPY|¥/i.test(val)) return { amount, currency: "JPY" };

  if (/USD|\$/i.test(val)) return { amount, currency: "USD" };

  if (/IDR|Rp/i.test(val)) return { amount, currency: "IDR" };

  return { amount: 0, currency: null };
}

/* ================= TABLE DRAW HELPER ================= */

function drawTable(doc, headers, rows, startY, startX = 40) {
  const columnWidth = (doc.page.width - startX * 2) / headers.length;
  let y = startY;

  doc.font("NotoSans-Bold").fontSize(11);

  // HEADER
  headers.forEach((h, i) => {
    doc
      .rect(startX + i * columnWidth, y, columnWidth, 25)
      .fill("#9933FF")
      .stroke("#000");

    doc.fillColor("#FFFFFF").text(h, startX + 5 + i * columnWidth, y + 7, {
      width: columnWidth - 10,
      align: "left",
    });
  });

  y += 25;
  doc.font("NotoSans").fillColor("#000000");

  // ROWS
  rows.forEach((row) => {
    let rowHeight = 0;

    // 🔥 HITUNG HEIGHT PALING TINGGI DI ROW
    row.forEach((cell) => {
      const cellHeight = doc.heightOfString(cell ?? "-", {
        width: columnWidth - 10,
        align: "left",
      });

      rowHeight = Math.max(rowHeight, cellHeight);
    });

    rowHeight += 10;

    // AUTO PAGE BREAK
    if (y + rowHeight > doc.page.height - 40) {
      doc.addPage();
      y = 40;
    }

    // DRAW CELL
    row.forEach((cell, i) => {
      doc.rect(startX + i * columnWidth, y, columnWidth, rowHeight).stroke();

      doc.text(cell ?? "-", startX + 5 + i * columnWidth, y + 5, {
        width: columnWidth - 10,
      });
    });

    y += rowHeight;
  });

  return y;
}

function buildFullWeather(weather: any): string {
  if (!weather?.current) return "-";

  const forecast = weather?.forecast_summary
    ? `Rain: ${weather.forecast_summary.rain_expected ? "Yes" : "No"}
Temp Range: ${weather.forecast_summary.temp_min ?? "-"}°C - ${weather.forecast_summary.temp_max ?? "-"}°C`
    : "-";

  const alerts = weather?.alerts?.length
    ? weather.alerts.map((a: any) => a.event).join(", ")
    : "No severe weather alerts";

  const insight = weather?.insights
    ? `Umbrella: ${weather.insights.umbrella ? "Recommended" : "Not needed"}
Beach: ${weather.insights.beach ? "Suitable" : "Not recommended"}
Sunset Visibility: ${weather.insights.sunset ?? "-"}`
    : "-";

  return `
Temperature: ${weather.current.temperature_c ?? "-"}°C
Feels Like: ${weather.current.feels_like_c ?? "-"}°C
Humidity: ${weather.current.humidity ?? "-"}%
Wind: ${weather.current.wind_speed ?? "-"} km/h
Cloud: ${weather.current.cloud_coverage ?? "-"}%
Visibility: ${weather.current.visibility ?? "-"} km
Condition: ${weather.current.description ?? "-"}

Forecast:
${forecast}

Alerts: ${alerts}

Travel Insight:
${insight}
`.trim();
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

  doc.registerFont(
    "NotoSans",
    path.join(process.cwd(), "fonts/NotoSans-Regular.ttf"),
  );
  doc.registerFont(
    "NotoSans-Bold",
    path.join(process.cwd(), "fonts/NotoSans-Bold.ttf"),
  );
  doc.font("NotoSans");

  const buffers: Uint8Array[] = [];
  doc.on("data", buffers.push.bind(buffers));

  /* ================= HEADER ================= */
  doc.rect(0, 0, doc.page.width, 40).fill("#9933FF");
  doc
    .fillColor("#FFFFFF")
    .font("NotoSans-Bold")
    .fontSize(18)
    .text("TRAVEL ITINERARY", 0, 12, { align: "center" });

  doc.moveDown(2).fillColor("#000000");

  /* ================= INFORMATION DETAIL ================= */

  const weather = context?.weatherJson as any;

  const travelDate =
    context?.tripStart && context?.tripEnd
      ? `${new Date(context.tripStart).toDateString()} - ${new Date(context.tripEnd).toDateString()}`
      : "-";

  const fullWeather = buildFullWeather(context?.weatherJson);

  const tableStartX = 80;
  const infoRows = [
    ["Travel Date", travelDate],
    ["Country", context?.countryCode || "-"],
    ["City", context?.city || "-"],
    ["Number of Travelers", "1"],
    ["Major Event", context?.holidaySummary || "-"],
    ["National Day", context?.holidaySummary || "-"],
    ["Weather", fullWeather],
    ["Travel News", context?.disasterSummary || "-"],
  ];

  doc
    .font("NotoSans-Bold")
    .fontSize(16)
    .text("Information Detail", tableStartX, doc.y);

  doc.moveDown(0.5);

  drawTable(doc, ["Item", "Details"], infoRows, doc.y, tableStartX);

  /* ================= GROUP ITINERARY ================= */

  const grouped: Record<number, typeof itinerary> = {};
  itinerary.forEach((item) => {
    if (!grouped[item.dayNumber]) grouped[item.dayNumber] = [];
    grouped[item.dayNumber].push(item);
  });

  Object.keys(grouped).forEach((day) => {
    doc.addPage();
    doc
      .font("NotoSans-Bold")
      .fontSize(16)
      .text(`Day ${day}`, { underline: true });
    doc.moveDown();

    console.log(
      grouped[Number(day)].filter((it) =>
        it.time?.toLowerCase().includes("time"),
      ),
    );

    const rows = grouped[Number(day)]
      .filter((it) => {
        const time = it.time?.trim().toLowerCase();
        const title = it.title?.trim().toLowerCase();
        const desc = it.description?.toLowerCase() || "";

        const isHeader =
          time === "time" &&
          title === "activity" &&
          (desc.includes("note") ||
            desc.includes("location") ||
            desc.includes("address"));

        return !isHeader;
      })
      .map((it) => {
        const detailsParts = [];

        if (it.description) detailsParts.push(cleanText(it.description));

        if (it.location)
          detailsParts.push("Location: " + cleanText(it.location));

        return [
          it.time || "-",
          cleanText(it.title),
          detailsParts.join("\n") || "-",
          it.price || "-",
        ];
      });

    drawTable(doc, ["Time", "Activity", "Details", "Cost"], rows, doc.y + 10);
  });

  /* ================= BUDGET SUMMARY ================= */

  doc.addPage();
  doc.rect(0, 0, doc.page.width, 40).fill("#9933FF");
  doc
    .fillColor("#FFFFFF")
    .font("NotoSans-Bold")
    .fontSize(18)
    .text("BUDGET SUMMARY", 0, 12, { align: "center" });

  doc.moveDown(2).fillColor("#000000");

  const currencyTotals: Record<string, number> = {};
  const dayTotals: Record<string, Record<string, number>> = {};

  Object.keys(grouped).forEach((day) => {
    grouped[Number(day)].forEach((it) => {
      const { amount, currency } = parseCost(it.price);

      if (!currency || amount === 0) return; // ⛔ skip FREE

      currencyTotals[currency] = (currencyTotals[currency] || 0) + amount;

      if (!dayTotals[day]) dayTotals[day] = {};

      dayTotals[day][currency] = (dayTotals[day][currency] || 0) + amount;
    });
  });

  const totalDays = Object.keys(grouped).length;

  const accommodation = context?.hotelName
    ? context.hotelBudget
      ? `${context.hotelName} ($${context.hotelBudget})`
      : context.hotelName
    : "-";

  const transportation =
    context?.flightInfo && context?.groundTransport
      ? `${context.flightInfo} + ${context.groundTransport}`
      : context?.groundTransport || context?.flightInfo || "-";

  const totalRows = Object.entries(currencyTotals).map(([cur, amt]) =>
    formatCurrency(amt, cur),
  );

  const avgRows = Object.entries(currencyTotals).map(([cur, amt]) =>
    formatCurrency(Math.round(amt / totalDays), cur),
  );

  const budgetRows = [
    ["Total Estimated Cost", totalRows.join(" / ")],
    ["Daily Average Per Person", avgRows.join(" / ")],
    ["Accommodation", accommodation],
    ["Transportation", transportation],
  ];

  Object.keys(dayTotals).forEach((day) => {
    const totals = Object.entries(dayTotals[day])
      .map(([cur, amt]) => formatCurrency(amt, cur))
      .join(" / ");

    budgetRows.push([`Day ${day} Total`, totals]);
  });

  drawTable(doc, ["Category", "Amount"], budgetRows, doc.y + 10);

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(buffers)));
  });
}

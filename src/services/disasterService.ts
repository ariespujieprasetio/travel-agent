import axios from "axios";

export interface DisasterAlert {
  title: string;
  type: string;
  severity: "Green" | "Orange" | "Red";
  country: string;
  description: string;
  startDate: string;
  endDate?: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

const GDACS_FEED = "https://www.gdacs.org/xml/gdacs.geojson";

// 🔥 CACHE GLOBAL 10 MENIT
let cachedFeed: any = null;
let lastFetch = 0;

const CACHE_TTL = 10 * 60 * 1000;

async function getGDACSFeedSafe() {
  const now = Date.now();

  if (cachedFeed && now - lastFetch < CACHE_TTL) {
    console.log("⚡ Using cached GDACS feed");
    return cachedFeed;
  }

  try {
    console.log("🌋 Fetching GDACS feed...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await axios.get(GDACS_FEED, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    cachedFeed = res.data;
    lastFetch = now;

    return cachedFeed;
  } catch (err: any) {
    console.log("⚠️ GDACS skipped (timeout or blocked)");
    return null;
  }
}

export async function fetchDisasterAlertsByCountry(
  iso3: string
): Promise<DisasterAlert[]> {

  const feed = await getGDACSFeedSafe();
  if (!feed) return [];

  const events = feed?.features || [];
  const now = new Date();

  const countryEvents = events.filter(
    (e: any) => e.properties?.iso3 === iso3
  );

  console.log(`GDACS events for ${iso3}:`, countryEvents.length);

  return countryEvents
    .map((e: any) => {
      const p = e.properties;

      return {
        title: p.eventname,
        type: p.eventtype,
        severity: p.alertlevel as "Green" | "Orange" | "Red",
        country: p.country,
        description: p.description || "No description",
        startDate: p.fromdate,
        endDate: p.todate,
        coordinates: {
          lat: e.geometry?.coordinates?.[1],
          lon: e.geometry?.coordinates?.[0],
        },
      };
    })
    .filter((event: DisasterAlert) => {
      if (!event.startDate) return false;

      const start = new Date(event.startDate);
      const end = event.endDate ? new Date(event.endDate) : null;

      return (
        (end && end >= now) ||
        (!end && now.getTime() - start.getTime() < 7 * 86400000)
      );
    });
}

//
// 🔥 TAMBAHIN INI DI PALING BAWAH (INI YANG KEMARIN HILANG)
//

export function mapDisasterSeverityToMessage(alert: DisasterAlert): string {
  switch (alert.severity) {
    case "Red":
      return `🔴 **Severe ${alert.type} Alert**: ${alert.title}. Travel disruption likely. Monitor official updates and consider adjusting plans.`;

    case "Orange":
      return `🟠 **Moderate ${alert.type} Alert**: ${alert.title}. Some impact possible. Stay informed and allow extra flexibility in your schedule.`;

    case "Green":
      return `🟢 **Minor ${alert.type} Activity**: ${alert.title}. Low impact expected, but stay aware of local conditions.`;

    default:
      return `⚠️ **Natural Event Detected**: ${alert.title}. Stay updated with local authorities.`;
  }
}

export function buildDisasterNewsSummary(alerts: DisasterAlert[]): string {
  if (!alerts.length) {
    return "No major travel disruptions or safety advisories are widely reported at this time.";
  }

  return alerts.map(mapDisasterSeverityToMessage).join("\n");
}

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

export async function fetchDisasterAlertsByCountry(
  iso3: string
): Promise<DisasterAlert[]> {
  try {
    console.log("Fetching GDACS global disaster feed...");

    const res = await axios.get(GDACS_FEED);
    const events = res.data?.features || [];
    const now = new Date();

    const countryEvents = events.filter(
      (e: any) => e.properties?.iso3 === iso3
    );

    console.log(`GDACS events found for ${iso3}:`, countryEvents.length);

    return countryEvents
      .map((e: any) => {
        const p = e.properties;

        return {
          title: p.eventname,
          type: p.eventtype,
          severity: p.alertlevel as "Green" | "Orange" | "Red",
          country: p.country,
          description:
            p.description || "No detailed description provided.",
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
          (!end && now.getTime() - start.getTime() < 7 * 24 * 60 * 60 * 1000)
        );
      });
  } catch (err) {
    console.error("❌ GDACS fetch failed:", err);
    return [];
  }
}

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

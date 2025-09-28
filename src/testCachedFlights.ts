import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const API_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;

if (!API_TOKEN) {
  throw new Error("❌ TRAVELPAYOUTS_API_TOKEN not set in .env");
}

async function getCachedFlights(origin: string, destination: string, date: string) {
  const url = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=${origin}&destination=${destination}&departure_at=${date}&currency=idr&limit=5&token=${API_TOKEN}`;

  const res = await fetch(url);
  const text = await res.text();
  console.log(`📅 Checking ${date} → RAW RESPONSE:`, text);

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const json = JSON.parse(text);
  return json.data || [];
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

(async () => {
  const origin = "CGK"; // Jakarta
  const destination = "KUL"; // Kuala Lumpur
  const today = new Date();

  let found = false;

  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i + 1); 
    try {
      const flights = await getCachedFlights(origin, destination, date);
      if (flights.length > 0) {
        console.log("✅ Found flights:", flights);
        found = true;
        break;
      }
    } catch (err) {
      console.error("Error:", err);
    }
  }

  if (!found) {
    console.warn("⚠️ No cached flights found for the next 7 days.");
  }
})();

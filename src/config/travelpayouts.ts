// travelpayouts.ts — Velutara Final Edition
// -------------------------------------------------------------
// Hotel API : hotellook (engine.hotellook.com)
// Flight API: /v1/prices/cheap (primary), fallback to /aviasales/v3/prices_for_dates
// CarRent   : placeholder (TP doesn’t provide; you can swap later)
// -------------------------------------------------------------

import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const API_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;
if (!API_TOKEN) {
  throw new Error("TRAVELPAYOUTS_API_TOKEN is not set in your .env file");
}

const BASE_HOTEL_URL = "https://engine.hotellook.com/api/v2";
const BASE_FLIGHT_URL = "https://api.travelpayouts.com/v1/prices/cheap";
const BASE_FLIGHT_CACHE_URL = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";

//--------------------------------------------------------------
// Types
//--------------------------------------------------------------
interface Coordinates {
  lat: number;
  lon: number;
}
export interface Hotel {
  phone: any;
  price_to: number | undefined;
  name: string;
  address: string;
  stars: number;
  rating: number;
  coords: Coordinates;
  price_from?: number;
  deeplink?: string;
}

//--------------------------------------------------------------
// Helpers
//--------------------------------------------------------------
function ensureHeaders() {
  return { "X-Access-Token": API_TOKEN } as Record<string, string>;
}

function dateOffset(days = 30) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

//--------------------------------------------------------------
// 1) HOTEL SEARCH (HotelLook)
//--------------------------------------------------------------
export async function find_hotels_new(
  city: string,
  stars: number,
  checkIn: string = dateOffset(30),
  checkOut: string = dateOffset(32),
  adults = 2,
  limit = 5
): Promise<Hotel[]> {
  try {
    const qs = new URLSearchParams();
    qs.append("location", city);
    qs.append("checkIn", checkIn);
    qs.append("checkOut", checkOut);
    qs.append("currency", "usd");
    qs.append("adults", adults.toString());
    qs.append("limit", limit.toString());
    if (API_TOKEN) qs.append("token", API_TOKEN);

    const res = await fetch(`${BASE_HOTEL_URL}/cache.json?${qs}`, {
      headers: ensureHeaders(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Hotel search failed: ${res.status} ${text}`);
    }

    const data: any[] = await res.json();
    const result: Hotel[] = [];

    for (const h of data.filter((h) => h.stars >= stars).slice(0, limit)) {
      let detail = h;
      try {
        const detailRes = await fetch(
          `${BASE_HOTEL_URL}/hotel/${h.hotelId}/details.json`,
          { headers: ensureHeaders() }
        );
        if (detailRes.ok) {
          detail = await detailRes.json();
        }
      } catch {
        /* ignore detail errors */
      }

      result.push({
        name: detail.hotelName || detail.name,
        address: detail.address || "Address not available",
        stars: detail.stars || 0,
        rating: detail.rating || 0,
        coords: {
          lat: detail.location?.geo?.lat || 0,
          lon: detail.location?.geo?.lon || 0,
        },
        price_from: detail.priceFrom || detail.price || 0,
        price_to: detail.priceTo || undefined,
        phone: detail.phone || "Phone not available",
        deeplink: detail.link || null,
      });
    }

    return result;
  } catch (e: any) {
    console.error("Hotel search failed:", e.message);
    return [];
  }
}

export { find_hotels_new as find_hotels };

export async function find_top_rated_hotels_new(
  city: string,
  stars: number,
  count = 5
) {
  const hotels = await find_hotels_new(city, stars, undefined, undefined, 2, 30);
  return hotels
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, count);
}

export { find_top_rated_hotels_new as find_top_rated_hotels };

//--------------------------------------------------------------
// 1b) HOTEL SEARCH with merged details
//--------------------------------------------------------------
export async function search_hotels(
  city: string,
  stars: number,
  checkIn: string = dateOffset(30),
  checkOut: string = dateOffset(32),
  adults = 2,
  limit = 5
): Promise<Hotel[]> {
  try {
    const qs = new URLSearchParams();
    qs.append("location", city);
    qs.append("checkIn", checkIn);
    qs.append("checkOut", checkOut);
    qs.append("currency", "usd");
    qs.append("adults", adults.toString());
    qs.append("limit", limit.toString());
    if (API_TOKEN) qs.append("token", API_TOKEN);

    const res = await fetch(`${BASE_HOTEL_URL}/cache.json?${qs}`, {
      headers: ensureHeaders(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Hotel search failed: ${res.status} ${text}`);
    }

    const data: any[] = await res.json();
    const hotels: Hotel[] = [];

    for (const h of data.filter((h) => h.stars >= stars).slice(0, limit)) {
      let detail: any = {};

      try {
        // coba ambil detail lewat lookup
        const detailRes = await fetch(
          `${BASE_HOTEL_URL}/lookup.json?query=${encodeURIComponent(h.hotelName || h.name)}`,
          { headers: ensureHeaders() }
        );
        if (detailRes.ok) {
          const lookup = await detailRes.json();
          detail = lookup?.results?.[0] || {};
        }
      } catch (e) {
        console.warn("Lookup failed for:", h.hotelId, e);
      }

      hotels.push({
        name: h.hotelName || h.name,
        address: detail.address || h.address || "Address not available",
        stars: h.stars || 0,
        rating: detail.rating || h.rating || 0,
        coords: {
          lat: detail.lat || h.location?.geo?.lat || 0,
          lon: detail.lon || h.location?.geo?.lon || 0,
        },
        price_from: h.priceFrom || h.price || 0,
        price_to: h.priceTo || undefined,
        phone: detail.phone || "Phone not available",
        deeplink: h.link || null,
      });
    }

    return hotels;
  } catch (e: any) {
    console.error("search_hotels failed:", e.message);
    return [];
  }
}


//--------------------------------------------------------------
// 2) FLIGHT SEARCH
//--------------------------------------------------------------
// ✅ Airline map lengkap (gabungan versi awal + Velutara)
const airlineMap: Record<string, { name: string; url: string }> = {
  // Indonesia
  GA: { name: "Garuda Indonesia", url: "https://www.garuda-indonesia.com/" },
  QZ: { name: "AirAsia Indonesia", url: "https://www.airasia.com/" },
  JT: { name: "Lion Air", url: "https://www.lionair.co.id/" },
  ID: { name: "Batik Air", url: "https://www.batikair.com/" },
  IW: { name: "Wings Air", url: "https://www.lionair.co.id/" },
  SJV: { name: "Super Air Jet", url: "https://www.superairjet.com/" },

  // Malaysia
  AK: { name: "AirAsia", url: "https://www.airasia.com/" },
  OD: { name: "Malindo Air", url: "https://www.batikair.com/my" },
  MH: { name: "Malaysia Airlines", url: "https://www.malaysiaairlines.com/" },

  // Singapore
  SQ: { name: "Singapore Airlines", url: "https://www.singaporeair.com/" },
  TR: { name: "Scoot", url: "https://www.flyscoot.com/" },

  // Thailand
  TG: { name: "Thai Airways", url: "https://www.thaiairways.com/" },
  FD: { name: "Thai AirAsia", url: "https://www.airasia.com/" },
  DD: { name: "Nok Air", url: "https://www.nokair.com/" },
  SL: { name: "Thai Lion Air", url: "https://www.lionairthai.com/" },

  // Philippines
  "5J": { name: "Cebu Pacific", url: "https://www.cebupacificair.com/" },
  PR: { name: "Philippine Airlines", url: "https://www.philippineairlines.com/" },

  // Vietnam
  VN: { name: "Vietnam Airlines", url: "https://www.vietnamairlines.com/" },
  VJ: { name: "VietJet Air", url: "https://www.vietjetair.com/" },

  // Other Asia
  CX: { name: "Cathay Pacific", url: "https://www.cathaypacific.com/" },
  CI: { name: "China Airlines", url: "https://www.china-airlines.com/" },
  BR: { name: "EVA Air", url: "https://www.evaair.com/" },
  JL: { name: "Japan Airlines", url: "https://www.jal.co.jp/" },
  NH: { name: "ANA", url: "https://www.ana.co.jp/" },
  KE: { name: "Korean Air", url: "https://www.koreanair.com/" },
  OZ: { name: "Asiana Airlines", url: "https://flyasiana.com/" },
  CZ: { name: "China Southern Airlines", url: "https://www.csair.com/" },
  MU: { name: "China Eastern Airlines", url: "https://www.ceair.com/" },

  // Middle East
  QR: { name: "Qatar Airways", url: "https://www.qatarairways.com/" },
  EK: { name: "Emirates", url: "https://www.emirates.com/" },
  EY: { name: "Etihad Airways", url: "https://www.etihad.com/" },
  SV: { name: "Saudia", url: "https://www.saudia.com/" },

  // Europe / International
  UA: { name: "United Airlines", url: "https://www.united.com/" },
  AA: { name: "American Airlines", url: "https://www.aa.com/" },
  BA: { name: "British Airways", url: "https://www.britishairways.com/" },
  AF: { name: "Air France", url: "https://www.airfrance.com/" },
  LH: { name: "Lufthansa", url: "https://www.lufthansa.com/" },
  KL: { name: "KLM", url: "https://www.klm.com/" },
  TK: { name: "Turkish Airlines", url: "https://www.turkishairlines.com/" },
};

function normalizeFlights(items: any[]) {
  return items.map((info: any) => {
    const airline = airlineMap[info.airline];
    return {
      airline: airline?.name || info.airline,
      airline_code: info.airline,
      airline_url: airline?.url || null,
      price: info.price,
      departure_at: info.departure_at,
      return_at: info.return_at,
      flight_number: info.flight_number,
      transfers: info.transfers,
      expires_at: info.expires_at,
      link: info.link ? `https://www.aviasales.com${info.link}` : null,
    };
  });
}

// Fallback using cached search (v3/prices_for_dates)
async function search_cached_flights(
  origin: string,
  destination: string,
  startDate: string,
  daysToCheck = 5
) {
  const today = new Date(startDate);
  for (let i = 0; i < daysToCheck; i++) {
    const date = addDays(today, i);
    const url = `${BASE_FLIGHT_CACHE_URL}?origin=${origin}&destination=${destination}&departure_at=${date}&currency=usd&limit=5&token=${API_TOKEN}`;
    const res = await fetch(url);
    const text = await res.text();
    console.log(`📅 Checking cache ${date}:`, text);

    if (res.ok) {
      const json = JSON.parse(text);
      if (json.data && json.data.length > 0) {
        console.log("✅ Using cached flights");
        return normalizeFlights(json.data);
      }
    }
  }
  return [];
}

export async function search_flights(
  origin: string,
  destination: string,
  departDate: string,
  returnDate?: string
) {
  try {
    // Step 1: try cheap prices
    const qs = new URLSearchParams();
    qs.append("origin", origin);
    qs.append("destination", destination);
    qs.append("depart_date", departDate);
    qs.append("currency", "usd");
    qs.append("token", API_TOKEN!);
    if (returnDate) qs.append("return_date", returnDate);

    const res = await fetch(`${BASE_FLIGHT_URL}?${qs}`, {
      headers: ensureHeaders(),
    });

    const text = await res.text();
    console.log("CHEAP RAW RESPONSE:", text);

    if (res.ok) {
      const json = JSON.parse(text);
      const flightData = json.data?.[destination] || {};
      if (Object.keys(flightData).length > 0) {
        console.log("✅ Using cheap prices");
        return normalizeFlights(Object.values(flightData));
      }
    }

    // Step 2: fallback to cached search
    console.warn("⚠️ No flights in cheap prices, fallback to cached...");
    return await search_cached_flights(origin, destination, departDate, 7);
  } catch (e: any) {
    console.error("Flight search error:", e.message);
    return [];
  }
}

//--------------------------------------------------------------
// 3) CAR RENTAL (ChatGPT-generated dummy)
//--------------------------------------------------------------
export interface CarRental {
  supplier: string;
  car_type: string;
  price_per_day: number;
  total_price: number;
  currency: string;
  pickup_location: string;
  dropoff_location: string;
}

export async function find_car_rentals(
  city: string,
  count = 3,
  days = 3,
  currency = "USD"
): Promise<CarRental[]> {
  // Data dummy supplier & tipe mobil
  const suppliers = ["Avis", "Hertz", "Budget", "Sixt", "Enterprise"];
  const carTypes = ["Compact", "SUV", "Sedan", "Van", "Convertible"];

  const rentals: CarRental[] = [];

  for (let i = 0; i < count; i++) {
    const supplier = suppliers[i % suppliers.length];
    const car_type = carTypes[i % carTypes.length];

    // random harga per hari antara 40–100 USD
    const price_per_day = 40 + Math.floor(Math.random() * 60);
    const total_price = price_per_day * days;

    rentals.push({
      supplier,
      car_type,
      price_per_day,
      total_price,
      currency,
      pickup_location: city,
      dropoff_location: city,
    });
  }

  return rentals;
}

// travelpayouts.ts — CLEAN & WORKING IMPLEMENTATION
// -------------------------------------------------------------
// All functions here rely on Travelpayouts REST APIs.
// - Hotels  : hotellook (engine.hotellook.com)
// - Flights : /v1/prices/cheap (stable)
// - CarRent : placeholder (TP doesn’t provide; you can swap later)
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
//--------------------------------------------------------------
// Types (simplified)
//--------------------------------------------------------------
interface Coordinates { lat: number; lon: number }
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

  if (!res.ok) throw new Error(`Hotel search failed: ${res.statusText}`);

  const data: any[] = await res.json();
  console.log("HOTEL RAW DATA", JSON.stringify(data, null, 2));

  const result: Hotel[] = [];

  for (const h of data.filter((h) => h.stars >= stars).slice(0, limit)) {
    let detail = h;

    // Jika kamu punya endpoint detail, ambil di sini
    try {
      const detailRes = await fetch(`${BASE_HOTEL_URL}/hotel/${h.hotelId}/details.json`, {
        headers: ensureHeaders(),
      });
      if (detailRes.ok) {
        detail = await detailRes.json();
      }
    } catch (e) {
      console.warn("Failed to fetch hotel detail for ID:", h.hotelId);
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
}

console.log("🔥 find_hotels_new DIPANGGIL");

export async function find_top_rated_hotels_new(
  city: string,
  stars: number,
  count = 5
) {
  // Ambil 30 data dulu, lalu sortir & ambil top count
  const hotels = await find_hotels_new(city, stars, undefined, undefined, 2, 30);
  return hotels
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, count); // hasil tetap memiliki address, phone, deeplink, dll
}
//--------------------------------------------------------------
// 2) FLIGHT SEARCH (cheap prices)
//--------------------------------------------------------------
const airlineMap: Record<string, { name: string; url: string }> = {
  // Indonesia
  GA: { name: "Garuda Indonesia", url: "https://www.garuda-indonesia.com/" },
  QZ: { name: "AirAsia Indonesia", url: "https://www.airasia.com/" },
  JT: { name: "Lion Air", url: "https://www.lionair.co.id/" },
  ID: { name: "Batik Air", url: "https://www.batikair.com/" },
  IW: { name: "Wings Air", url: "https://www.lionair.co.id/" }, // satu grup dengan Lion
  SJV: { name: "Super Air Jet", url: "https://www.superairjet.com/" },

  // Malaysia
  AK: { name: "AirAsia", url: "https://www.airasia.com/" },
  OD: { name: "Malindo Air", url: "https://www.batikair.com/my" },
  MH: { name: "Malaysia Airlines", url: "https://www.malaysiaairlines.com/" },

  // Singapore
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
  TK: { name: "Turkish Airlines", url: "https://www.turkishairlines.com/" },

  // Middle East
  QR: { name: "Qatar Airways", url: "https://www.qatarairways.com/" },
  EK: { name: "Emirates", url: "https://www.emirates.com/" },
  EY: { name: "Etihad Airways", url: "https://www.etihad.com/" },
  SV: { name: "Saudia", url: "https://www.saudia.com/" },

  // International
  SQ: { name: "Singapore Airlines", url: "https://www.singaporeair.com/" },
  UA: { name: "United Airlines", url: "https://www.united.com/" },
  AA: { name: "American Airlines", url: "https://www.aa.com/" },
  BA: { name: "British Airways", url: "https://www.britishairways.com/" },
  AF: { name: "Air France", url: "https://www.airfrance.com/" },
  LH: { name: "Lufthansa", url: "https://www.lufthansa.com/" },
  KL: { name: "KLM", url: "https://www.klm.com/" },
};

export async function search_flights(
  origin: string,
  destination: string,
  departDate: string,
  returnDate?: string
) {
  const qs = new URLSearchParams();
  qs.append("origin", origin);
  qs.append("destination", destination);
  qs.append("depart_date", departDate);
  qs.append("currency", "usd");
  qs.append("token", API_TOKEN!); // paksa karena sudah dicek sebelumnya
  if (returnDate) qs.append("return_date", returnDate);

  const res = await fetch(`${BASE_FLIGHT_URL}?${qs}`, {
    headers: ensureHeaders(),
  });

  const text = await res.text();
  console.log("RAW RESPONSE:", text); // bantu debug saat kosong

  if (!res.ok) throw new Error(`Flight search failed: ${text}`);

  const json = JSON.parse(text);

  if (!json.success) {
    console.error("TravelPayouts API Error Response:", JSON.stringify(json));
    throw new Error("Flight search failed: Invalid response from API");
  }

  const flightData = json.data?.[destination] || {};

  if (Object.keys(flightData).length === 0) {
    console.warn(`⚠️ No flight data found for destination: ${destination}`);
    return []; 
  }

  return Object.values(flightData).map((info: any) => {
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
    };
  });
}


//--------------------------------------------------------------
// 3) CAR RENTAL (placeholder)
//--------------------------------------------------------------
export async function find_car_rentals(city: string, count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    name: `Mocked Car Rental ${i + 1}`,
    city,
    price_per_day: 50 + i * 5,
  }));
}

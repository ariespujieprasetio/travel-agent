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
// 1) HOTEL SEARCH (HotelLook → Redirect ke Booking.com)
//--------------------------------------------------------------
export async function find_hotels(
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
        // 🔗 Redirect langsung ke Booking.com
        deeplink: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
          city
        )}&checkin=${checkIn}&checkout=${checkOut}&group_adults=${adults}&nflt=class=${stars}`,
      });
    }

    return result;
  } catch (e: any) {
    console.error("Hotel search failed:", e.message);
    return [];
  }
}

/**
 * Ambil hotel top rated
 */
export async function find_top_rated_hotels(
  city: string,
  stars: number,
  count = 5
) {
  const hotels = await find_hotels(city, stars, undefined, undefined, 2, 30);
  return hotels
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, count);
}

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
          `${BASE_HOTEL_URL}/lookup.json?query=${encodeURIComponent(
            h.hotelName || h.name
          )}`,
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
        // 🔗 Redirect langsung ke Booking.com
        deeplink: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
          city
        )}&checkin=${checkIn}&checkout=${checkOut}&group_adults=${adults}&nflt=class=${stars}`,
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
// ✅ Airline map lengkap
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

// 🌍 Mapping bandara → city
function mapBookingCode(iata: string): { code: string; entity: string; city: string; name: string; countryCode: string } {
  switch (iata) {
    // --- INDONESIA ---
    case "CGK": case "HLP": case "JKT": return { code: "JKT", entity: "city", city: "Jakarta", name: "Jakarta", countryCode: "ID" };
    case "DPS": return { code: "DPS", entity: "city", city: "Bali", name: "Ngurah Rai", countryCode: "ID" };
    case "SUB": return { code: "SUB", entity: "city", city: "Surabaya", name: "Juanda", countryCode: "ID" };
    case "UPG": return { code: "UPG", entity: "city", city: "Makassar", name: "Hasanuddin", countryCode: "ID" };
    case "KNO": return { code: "KNO", entity: "city", city: "Medan", name: "Kualanamu", countryCode: "ID" };

    // --- MALAYSIA ---
    case "KUL": case "SZB": return { code: "KUL", entity: "city", city: "Kuala Lumpur", name: "Kuala Lumpur", countryCode: "MY" };
    case "PEN": return { code: "PEN", entity: "city", city: "Penang", name: "Penang Intl", countryCode: "MY" };
    case "BKI": return { code: "BKI", entity: "city", city: "Kota Kinabalu", name: "Kota Kinabalu", countryCode: "MY" };

    // --- SINGAPORE ---
    case "SIN": return { code: "SIN", entity: "city", city: "Singapore", name: "Singapore", countryCode: "SG" };

    // --- THAILAND ---
    case "BKK": case "DMK": return { code: "BKK", entity: "city", city: "Bangkok", name: "Bangkok", countryCode: "TH" };
    case "HKT": return { code: "HKT", entity: "city", city: "Phuket", name: "Phuket", countryCode: "TH" };
    case "CNX": return { code: "CNX", entity: "city", city: "Chiang Mai", name: "Chiang Mai", countryCode: "TH" };

    // --- VIETNAM ---
    case "SGN": return { code: "SGN", entity: "city", city: "Ho Chi Minh City", name: "Tan Son Nhat", countryCode: "VN" };
    case "HAN": return { code: "HAN", entity: "city", city: "Hanoi", name: "Noi Bai", countryCode: "VN" };

    // --- PHILIPPINES ---
    case "MNL": return { code: "MNL", entity: "city", city: "Manila", name: "Ninoy Aquino", countryCode: "PH" };
    case "CEB": return { code: "CEB", entity: "city", city: "Cebu", name: "Mactan–Cebu", countryCode: "PH" };

    // --- JAPAN ---
    case "HND": case "NRT": return { code: "TYO", entity: "city", city: "Tokyo", name: "Tokyo", countryCode: "JP" };
    case "KIX": case "ITM": return { code: "OSA", entity: "city", city: "Osaka", name: "Osaka", countryCode: "JP" };
    case "CTS": return { code: "CTS", entity: "city", city: "Sapporo", name: "New Chitose", countryCode: "JP" };
    case "FUK": return { code: "FUK", entity: "city", city: "Fukuoka", name: "Fukuoka", countryCode: "JP" };

    // --- KOREA ---
    case "ICN": case "GMP": return { code: "SEL", entity: "city", city: "Seoul", name: "Seoul", countryCode: "KR" };

    // --- CHINA / HK ---
    case "HKG": return { code: "HKG", entity: "city", city: "Hong Kong", name: "Hong Kong", countryCode: "HK" };
    case "PVG": case "SHA": return { code: "SHA", entity: "city", city: "Shanghai", name: "Shanghai", countryCode: "CN" };
    case "PEK": case "PKX": return { code: "BJS", entity: "city", city: "Beijing", name: "Beijing", countryCode: "CN" };
    case "CAN": return { code: "CAN", entity: "city", city: "Guangzhou", name: "Guangzhou", countryCode: "CN" };

    // --- MIDDLE EAST ---
    case "DXB": return { code: "DXB", entity: "city", city: "Dubai", name: "Dubai", countryCode: "AE" };
    case "AUH": return { code: "AUH", entity: "city", city: "Abu Dhabi", name: "Abu Dhabi", countryCode: "AE" };
    case "DOH": return { code: "DOH", entity: "city", city: "Doha", name: "Doha", countryCode: "QA" };
    case "RUH": return { code: "RUH", entity: "city", city: "Riyadh", name: "Riyadh", countryCode: "SA" };
    case "JED": return { code: "JED", entity: "city", city: "Jeddah", name: "Jeddah", countryCode: "SA" };

    // --- EUROPE ---
    case "LHR": case "LGW": case "LCY": case "STN": case "LTN": return { code: "LON", entity: "city", city: "London", name: "London", countryCode: "GB" };
    case "CDG": case "ORY": return { code: "PAR", entity: "city", city: "Paris", name: "Paris", countryCode: "FR" };
    case "FRA": case "HHN": return { code: "FRA", entity: "city", city: "Frankfurt", name: "Frankfurt", countryCode: "DE" };
    case "MUC": return { code: "MUC", entity: "city", city: "Munich", name: "Munich", countryCode: "DE" };
    case "AMS": return { code: "AMS", entity: "city", city: "Amsterdam", name: "Amsterdam", countryCode: "NL" };
    case "BCN": return { code: "BCN", entity: "city", city: "Barcelona", name: "Barcelona", countryCode: "ES" };
    case "MAD": return { code: "MAD", entity: "city", city: "Madrid", name: "Madrid", countryCode: "ES" };
    case "ROM": case "FCO": case "CIA": return { code: "ROM", entity: "city", city: "Rome", name: "Rome", countryCode: "IT" };
    case "IST": case "SAW": return { code: "IST", entity: "city", city: "Istanbul", name: "Istanbul", countryCode: "TR" };
    case "ZRH": return { code: "ZRH", entity: "city", city: "Zurich", name: "Zurich", countryCode: "CH" };

    // --- USA / AMERICAS ---
    case "JFK": case "EWR": case "LGA": return { code: "NYC", entity: "city", city: "New York", name: "New York", countryCode: "US" };
    case "LAX": case "BUR": case "LGB": case "SNA": case "ONT": return { code: "LAX", entity: "city", city: "Los Angeles", name: "Los Angeles", countryCode: "US" };
    case "SFO": case "OAK": case "SJC": return { code: "SFO", entity: "city", city: "San Francisco", name: "San Francisco", countryCode: "US" };
    case "CHI": case "ORD": case "MDW": return { code: "CHI", entity: "city", city: "Chicago", name: "Chicago", countryCode: "US" };
    case "MIA": case "FLL": case "PBI": return { code: "MIA", entity: "city", city: "Miami", name: "Miami", countryCode: "US" };
    case "WAS": case "IAD": case "DCA": case "BWI": return { code: "WAS", entity: "city", city: "Washington DC", name: "Washington DC", countryCode: "US" };
    case "BOS": return { code: "BOS", entity: "city", city: "Boston", name: "Boston", countryCode: "US" };
    case "YYZ": return { code: "YTO", entity: "city", city: "Toronto", name: "Toronto", countryCode: "CA" };
    case "YVR": return { code: "YVR", entity: "city", city: "Vancouver", name: "Vancouver", countryCode: "CA" };

    // --- AUSTRALIA ---
    case "SYD": return { code: "SYD", entity: "city", city: "Sydney", name: "Sydney", countryCode: "AU" };
    case "MEL": return { code: "MEL", entity: "city", city: "Melbourne", name: "Melbourne", countryCode: "AU" };
    case "BNE": return { code: "BNE", entity: "city", city: "Brisbane", name: "Brisbane", countryCode: "AU" };
    case "PER": return { code: "PER", entity: "city", city: "Perth", name: "Perth", countryCode: "AU" };

    // --- fallback ---
    default: return { code: iata, entity: "airport", city: iata, name: iata, countryCode: "" };
  }
}


// 🔁 Cached flights
async function search_cached_flights(origin: string, destination: string, startDate: string, daysToCheck = 5) {
  const today = new Date(startDate);
  for (let i = 0; i < daysToCheck; i++) {
    const date = addDays(today, i);
    const url = `${BASE_FLIGHT_CACHE_URL}?origin=${origin}&destination=${destination}&departure_at=${date}&currency=usd&limit=5&token=${API_TOKEN}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        return normalizeFlights(json.data, origin, destination, date);
      }
    }
  }
  return [];
}

// 🔁 Normalize flights
// 🔁 Normalize flights
function normalizeFlights(
  items: any[],
  origin: string,
  destination: string,
  departDate: string,
  returnDate?: string
) {
  return items.map((info: any) => {
    const airline = airlineMap[info.airline];

    // format ddMM
    const dDate = new Date(departDate);
    const depStr = `${String(dDate.getDate()).padStart(2, "0")}${String(
      dDate.getMonth() + 1
    ).padStart(2, "0")}`;

    let searchPath: string;

    if (returnDate && returnDate !== "") {
      // Roundtrip
      const rDate = new Date(returnDate);
      const retStr = `${String(rDate.getDate()).padStart(2, "0")}${String(
        rDate.getMonth() + 1
      ).padStart(2, "0")}`;
      searchPath = `${origin}${depStr}${destination}${retStr}1`;
    } else {
      // One-way
      searchPath = `${origin}${depStr}${destination}1`;
    }

    const aviasalesLink =
      `https://www.aviasales.com/search/${searchPath}?` +
      `adults=1&children=0&infants=0&trip_class=0&marker=${process.env.TRAVELPAYOUTS_MARKER}&currency=usd`;

    return {
      airline: airline?.name || info.airline,
      airline_code: info.airline,
      airline_url: aviasalesLink,
      price: info.price,
      departure_at: info.departure_at,
      return_at: info.return_at,
      flight_number: info.flight_number,
      transfers: info.transfers,
      expires_at: info.expires_at,
      link: aviasalesLink,
    };
  });
}



// 🔎 Main search
export async function search_flights(origin: string, destination: string, departDate: string, returnDate?: string) {
  try {
    const qs = new URLSearchParams();
    qs.append("origin", origin);
    qs.append("destination", destination);
    qs.append("depart_date", departDate);
    qs.append("currency", "usd");
    qs.append("token", API_TOKEN!);
    if (returnDate) qs.append("return_date", returnDate);

    const res = await fetch(`${BASE_FLIGHT_URL}?${qs}`, { headers: ensureHeaders() });
    if (res.ok) {
      const json = await res.json();
      const flightData = json.data?.[destination] || {};
      if (Object.keys(flightData).length > 0) {
        return normalizeFlights(Object.values(flightData), origin, destination, departDate, returnDate);
      }
    }

    return await search_cached_flights(origin, destination, departDate, 7);
  } catch (e: any) {
    console.error("Flight search error:", e.message);
    return [];
  }
}


//--------------------------------------------------------------
// 3) CAR RENTAL (Booking.com redirect edition)
//--------------------------------------------------------------
export interface CarRental {
  supplier: string;
  car_type: string;
  price_per_day: number;
  total_price: number;
  currency: string;
  pickup_location: string;
  dropoff_location: string;
  deeplink: string; // 🔗 link ke Booking.com
}

export async function find_car_rentals(
  city: string,
  count = 10,
  days = 3,
  currency = "USD"
): Promise<CarRental[]> {
  const suppliers = ["Avis", "Hertz", "Budget", "Sixt", "Enterprise"];
  const carTypes = ["Compact", "SUV", "Sedan", "Van", "Convertible"];

  const rentals: CarRental[] = [];
  const today = new Date();
  const pickupDate = today.toISOString().split("T")[0];
  const dropoffDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  let i = 0;
  while (rentals.length < count) {
    const supplier = suppliers[i % suppliers.length];
    const car_type = carTypes[i % carTypes.length];
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
      deeplink: `https://www.booking.com/cars/index.id.html?selected_currency=${currency}&aid=304142&pickup=${pickupDate}&dropoff=${dropoffDate}&city=${encodeURIComponent(
        city
      )}`,
    });

    i++;
  }

  return rentals;
}


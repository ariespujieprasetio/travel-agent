// bookingcom.ts — CLEAN IMPLEMENTATION via RapidAPI (Booking.com Flights + Hotels + Cars)
// -----------------------------------------------------------------------------
// - Flights   : /api/v1/flights/searchFlights (pakai originSkyId + originEntityId, dst.)
// - Hotels    : /api/v1/hotels/searchHotels
// - CarRent   : /api/v1/carRentals/searchCarRentals
// -----------------------------------------------------------------------------

import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const RAPID_API_KEY = process.env.RAPIDAPI_BOOKING_KEY;
if (!RAPID_API_KEY) {
  throw new Error("RAPIDAPI_BOOKING_KEY is not set in your .env file");
}

const BASE_URL = "https://booking-com15.p.rapidapi.com/api/v1";

//--------------------------------------------------------------
// Helpers
//--------------------------------------------------------------
function ensureHeaders() {
  return {
    "x-rapidapi-host": "booking-com15.p.rapidapi.com",
    "x-rapidapi-key": RAPID_API_KEY!,
  } as Record<string, string>;
}

function dateOffset(days = 30) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function normalizeDate(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date format: ${input}`);
  }
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

//--------------------------------------------------------------
// 0) LOCATION LOOKUP (needed for flights & hotels)
//--------------------------------------------------------------

// Hardcoded mapping for popular airports (skyId + entityId)
const airportMap: Record<string, { skyId: string; entityId: string; id: string }> = {
    CGK: { skyId: "CGK", entityId: "27539764", id: "AIRPORT-3728" }, // Jakarta Soekarno-Hatta
    DXB: { skyId: "DXB", entityId: "27539778", id: "AIRPORT-1783" }, // Dubai Intl
    SIN: { skyId: "SIN", entityId: "27539781", id: "AIRPORT-1762" }, // Singapore Changi
    KUL: { skyId: "KUL", entityId: "27539786", id: "AIRPORT-1760" }, // Kuala Lumpur Intl
    DOH: { skyId: "DOH", entityId: "27539793", id: "AIRPORT-1761" }, // Doha Hamad Intl
    BKK: { skyId: "BKK", entityId: "27539788", id: "AIRPORT-1759" }, // Bangkok Suvarnabhumi
    HKG: { skyId: "HKG", entityId: "27539790", id: "AIRPORT-1763" }, // Hong Kong Intl
    LHR: { skyId: "LHR", entityId: "27539795", id: "AIRPORT-1772" }, // London Heathrow
    JFK: { skyId: "JFK", entityId: "27539797", id: "AIRPORT-1773" }, // New York JFK
  };

async function getLocationRaw(query: string, type: "flights" | "hotels" = "flights") {
  const endpoint =
    type === "flights"
      ? `${BASE_URL}/flights/searchDestination?query=${encodeURIComponent(query)}`
      : `${BASE_URL}/hotels/searchDestination?query=${encodeURIComponent(query)}`;

  const res = await fetch(endpoint, { headers: ensureHeaders() });
  const json = await res.json();
  return json?.data?.[0] || null;
}

export async function getLocationId(query: string, type: "flights" | "hotels" = "flights"): Promise<string | null> {
  const loc = await getLocationRaw(query, type);
  return loc?.id || null;
}

//--------------------------------------------------------------
// 1) FLIGHT SEARCH
//--------------------------------------------------------------

export interface Flight {
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  price: number;
  currency: string;
  deepLink?: string;
}

export async function search_flights_booking(
  origin: string,
  destination: string,
  departDate: string,
  returnDate?: string,
  adults = 1,
  currency = "USD"
): Promise<Flight[]> {
  try {
    // 🔹 Gunakan hardcoded map dulu, kalau nggak ada → fallback ke API searchDestination
    const fromLoc =
      airportMap[origin.toUpperCase()] || (await getLocationRaw(origin, "flights"));
    const toLoc =
      airportMap[destination.toUpperCase()] || (await getLocationRaw(destination, "flights"));

    if (!fromLoc?.skyId || !fromLoc?.entityId || !toLoc?.skyId || !toLoc?.entityId) {
      throw new Error(`Invalid origin/destination: ${origin} → ${destination}`);
    }

    const qs = new URLSearchParams();

    console.log("DEBUG PARAMS:", {
    fromId: fromLoc.id,          // contoh: "AIRPORT-3728"
    toId: toLoc.id,              // contoh: "AIRPORT-1783"
    departDate: normalizeDate(departDate),
    });

    qs.append("fromId", fromLoc.id);
    qs.append("toId", toLoc.id);
    qs.append("departDate", normalizeDate(departDate));
    qs.append("adults", adults.toString());
    qs.append("currency", currency);

    if (returnDate) {
    qs.append("returnDate", normalizeDate(returnDate));
    }

    const res = await fetch(`${BASE_URL}/flights/searchFlights?${qs}`, {
    headers: ensureHeaders(),
    });


    const text = await res.text();
    console.log("RAW FLIGHT RESPONSE:", text);

    if (!res.ok) throw new Error(`Flight search failed: ${res.status} ${res.statusText}`);

    const json = JSON.parse(text);
    const offers: any[] = json?.data?.flightOffers || [];

    return offers.map((o: any) => ({
      airline: o.validatingAirlineCodes?.[0] || "Unknown",
      flightNumber:
        o.itineraries?.[0]?.segments?.[0]?.carrierCode +
        o.itineraries?.[0]?.segments?.[0]?.number,
      departure: o.itineraries?.[0]?.segments?.[0]?.departure?.at,
      arrival: o.itineraries?.[0]?.segments?.[0]?.arrival?.at,
      price: parseFloat(o.price?.total) || 0,
      currency: o.price?.currency || currency,
      deepLink: o.deepLink || null,
    }));
  } catch (e: any) {
    console.error("Booking.com Flight API error:", e.message);
    return [];
  }
}

//--------------------------------------------------------------
// 2) HOTEL SEARCH
//--------------------------------------------------------------

export interface Hotel {
  id: string;
  name: string;
  address: string;
  stars: number;
  reviewScore: number;
  priceFrom: number;
  currency: string;
  deepLink?: string;
}

export async function find_hotels_booking(
  cityName: string,
  checkIn: string = dateOffset(30),
  checkOut: string = dateOffset(32),
  adults = 2,
  limit = 5,
  currency = "USD"
): Promise<Hotel[]> {
  try {
    const locationId = await getLocationId(cityName, "hotels");
    if (!locationId) throw new Error(`Invalid hotel location: ${cityName}`);

    const qs = new URLSearchParams();
    qs.append("dest_id", locationId);
    qs.append("checkin_date", checkIn);
    qs.append("checkout_date", checkOut);
    qs.append("adults_number", adults.toString());
    qs.append("currency_code", currency);
    qs.append("size", limit.toString());

    const res = await fetch(`${BASE_URL}/hotels/searchHotels?${qs}`, {
      headers: ensureHeaders(),
    });

    const text = await res.text();
    console.log("RAW HOTEL RESPONSE:", text);

    if (!res.ok) {
      throw new Error(`Hotel search failed: ${res.status} ${res.statusText}`);
    }

    const json = JSON.parse(text);
    const hotels: any[] = json?.data?.hotels || [];

    return hotels.map((h: any) => ({
      id: h.hotel_id,
      name: h.property?.name || "Unknown Hotel",
      address: h.property?.address || "Address not available",
      stars: h.property?.stars || 0,
      reviewScore: h.property?.reviewScore || 0,
      priceFrom: h.priceBreakdown?.grossPrice?.value || 0,
      currency: h.priceBreakdown?.grossPrice?.currency || currency,
      deepLink: h.url || null,
    }));
  } catch (e: any) {
    console.error("Booking.com Hotel API error:", e.message);
    return [];
  }
}

//--------------------------------------------------------------
// 3) CAR RENTAL SEARCH
//--------------------------------------------------------------

export interface CarRental {
  provider: string;
  vehicle: string;
  category: string;
  pricePerDay: number;
  currency: string;
  deepLink?: string;
}

export async function find_car_rentals_booking(
  cityName: string,
  pickUp: string = dateOffset(30),
  dropOff: string = dateOffset(32),
  currency = "USD"
): Promise<CarRental[]> {
  try {
    const qs = new URLSearchParams();
    qs.append("query", cityName);
    qs.append("pickUp_date", pickUp);
    qs.append("dropOff_date", dropOff);
    qs.append("currency_code", currency);

    const res = await fetch(`${BASE_URL}/carRentals/searchCarRentals?${qs}`, {
      headers: ensureHeaders(),
    });

    const text = await res.text();
    console.log("RAW CAR RESPONSE:", text);

    if (!res.ok) {
      throw new Error(`Car rental search failed: ${res.status} ${res.statusText}`);
    }

    const json = JSON.parse(text);
    const cars: any[] = json?.data?.cars || [];

    return cars.map((c: any) => ({
      provider: c.provider?.name || "Unknown",
      vehicle: c.vehicle_info?.name || "Unknown Vehicle",
      category: c.vehicle_info?.category || "N/A",
      pricePerDay: c.priceBreakdown?.grossPrice?.value || 0,
      currency: c.priceBreakdown?.grossPrice?.currency || currency,
      deepLink: c.url || null,
    }));
  } catch (e: any) {
    console.error("Booking.com Car Rental API error:", e.message);
    return [];
  }
}

import axios from "axios";
import { config } from "../config/env";

// 🔥 CACHE 24 JAM
const holidayCache = new Map<string, any>();
const TTL = 24 * 60 * 60 * 1000;

export async function fetchHolidays(countryCode: string, year: number) {

  const key = `${countryCode}_${year}`;
  const now = Date.now();

  // ⚡ CACHE HIT
  if (holidayCache.has(key)) {
    const cached = holidayCache.get(key);
    if (now - cached.timestamp < TTL) {
      console.log("⚡ Using cached holidays");
      return cached.data;
    }
  }

  console.log("📅 Fetching holidays from Calendarific...");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await axios.get(
      "https://calendarific.com/api/v2/holidays",
      {
        params: {
          api_key: config.calendarific.apiKey,
          country: countryCode,
          year,
          type: "national,religious",
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    const holidays = res.data?.response?.holidays || [];

    holidayCache.set(key, {
      data: holidays,
      timestamp: now
    });

    return holidays;

  } catch (err: any) {
    console.log("⚠️ Holiday fetch skipped (timeout)");
    return []; // ❗️JANGAN THROW
  }
}

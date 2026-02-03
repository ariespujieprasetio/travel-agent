import axios from "axios";
import { config } from "../config/env";

export async function fetchHolidays(countryCode: string, year: number) {
  try {
    const res = await axios.get("https://calendarific.com/api/v2/holidays", {
      params: {
        api_key: config.calendarific.apiKey,
        country: countryCode,
        year,
        type: "national,religious",
      },
    });

    return res.data.response.holidays || [];
  } catch (err: any) {
    console.error("❌ Holiday API error:", err.response?.data || err.message);
    return [];
  }
}

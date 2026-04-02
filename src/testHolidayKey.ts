import axios from "axios";
import { config } from "./config/env";

async function test() {
  try {
    const res = await axios.get("https://calendarific.com/api/v2/holidays", {
      params: {
        api_key: config.calendarific.apiKey,
        country: "JP",
        year: 2026,
      },
    });

    console.log("✅ API KEY WORKS");
    console.log("Holidays count:", res.data.response.holidays.length);
  } catch (err: any) {
    console.error("❌ API KEY ERROR");
    console.error(err.response?.data || err.message);
  }
}

test();

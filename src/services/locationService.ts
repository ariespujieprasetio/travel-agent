import axios from "axios";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import { config } from "../config/env";

countries.registerLocale(en);

export async function resolveCountryCode(location: string): Promise<string | null> {
  const query = location.trim();

  try {
    const geo = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address: query,
          key: config.google.apiKey,
        },
      }
    );

    const components = geo.data.results?.[0]?.address_components || [];
    const countryComp = components.find((c: any) =>
      c.types.includes("country")
    );

    if (countryComp?.short_name) {
      console.log("🌍 Resolved via Google Geocode:", countryComp.short_name);
      return countryComp.short_name;
    }
  } catch (e) {
    console.error("Geocode lookup failed:", e);
  }

  // 🔹 Try direct country name (e.g. "Japan", "Indonesia")
  const isoDirect = countries.getAlpha2Code(query, "en");
  if (isoDirect) {
    console.log("🌎 Resolved via ISO country list:", isoDirect);
    return isoDirect;
  }

  // 🔹 Try last word as country (e.g. "Jakarta Indonesia")
  const parts = query.split(" ");
  const lastWord = parts[parts.length - 1];
  const isoFromLastWord = countries.getAlpha2Code(lastWord, "en");
  if (isoFromLastWord) {
    console.log("🌎 Resolved via last word country:", isoFromLastWord);
    return isoFromLastWord;
  }

  // 🔹 Smart fallback for very common cities when geocoder fails
  const lower = query.toLowerCase();

  if (lower.includes("jakarta")) {
    console.log("🌏 Fallback match: Jakarta → ID");
    return "ID";
  }

  if (lower.includes("bali")) {
    console.log("🌏 Fallback match: Bali → ID");
    return "ID";
  }

  if (lower.includes("tokyo")) {
    console.log("🌏 Fallback match: Tokyo → JP");
    return "JP";
  }

  console.log("❌ Could not resolve country for:", query);
  return null;
}

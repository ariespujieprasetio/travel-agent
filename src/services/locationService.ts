import axios from "axios";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import { config } from "../config/env";

countries.registerLocale(en);

async function resolveCountryFromGeoNames(city: string): Promise<string | null> {
    try {
      const res = await axios.get("http://api.geonames.org/searchJSON", {
        timeout: 2500,
        params: {
          q: city,
          maxRows: 1,
          username: config.geonames.username,
        },
      });
  
      const place = res.data?.geonames?.[0];
      if (place?.countryCode) {
        console.log("Resolved via GeoNames:", place.countryCode);
        return place.countryCode; 
      }
    } catch (err) {
      console.error("GeoNames lookup failed:", err);
    }
  
    return null;
  }  

export async function resolveCountryCode(location: string): Promise<string | null> {
    const query = location.trim();
  
    try {
      const geo = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
          params: { address: query, key: config.google.apiKey },
        }
      );
  
      const components = geo.data.results?.[0]?.address_components || [];
      const countryComp = components.find((c: any) =>
        c.types.includes("country")
      );
  
      if (countryComp?.short_name) {
        console.log("Resolved via Google Geocode:", countryComp.short_name);
        return countryComp.short_name;
      }
    } catch (e) {
      console.error("Geocode lookup failed:", e);
    }
  
    const geoNamesResult = await resolveCountryFromGeoNames(query);
    if (geoNamesResult) return geoNamesResult;
  
    const isoDirect = countries.getAlpha2Code(query, "en");
    if (isoDirect) {
      console.log("Resolved via ISO country list:", isoDirect);
      return isoDirect;
    }
  
    const parts = query.split(" ");
    const lastWord = parts[parts.length - 1];
    const isoFromLastWord = countries.getAlpha2Code(lastWord, "en");
    if (isoFromLastWord) {
      console.log("Resolved via last word country:", isoFromLastWord);
      return isoFromLastWord;
    }
  
    console.log("Could not resolve country for:", query);
    return null;
  }  

export function convertIso2ToIso3(iso2: string | null): string | null {
  if (!iso2) return null;

  const iso3 = countries.alpha2ToAlpha3(iso2.toUpperCase());
  if (iso3) {
    console.log(`Converted ISO2 → ISO3: ${iso2} → ${iso3}`);
    return iso3;
  }

  console.log("Failed ISO2 → ISO3 conversion for:", iso2);
  return null;
}

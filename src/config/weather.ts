import axios from "axios";

const OPENWEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather";

export async function getWeather(city: string) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY not found!");

  console.log("🌤️ Fetching weather for:", city);

  const response = await axios.get(OPENWEATHER_API_URL, {
    params: {
      q: city,
      appid: apiKey,
      units: "metric",
      lang: "en",
    },
  });

  const d = response.data;

  return {
    location: {
      city: d.name,
      country: d.sys.country,
      coordinates: {
        lat: d.coord.lat,
        lon: d.coord.lon,
      },
      timezone_offset_sec: d.timezone,
    },

    weather: {
      main: d.weather[0].main,
      description: d.weather[0].description,
      icon: d.weather[0].icon,
    },

    temperature: {
      current_c: d.main.temp,
      feels_like_c: d.main.feels_like,
      min_c: d.main.temp_min,
      max_c: d.main.temp_max,
    },

    atmosphere: {
      humidity_percent: d.main.humidity,
      pressure_hpa: d.main.pressure,
      sea_level_hpa: d.main.sea_level ?? null,
      ground_level_hpa: d.main.grnd_level ?? null,
      cloud_coverage_percent: d.clouds.all,
      visibility_km: d.visibility / 1000,
    },

    wind: {
      speed_mps: d.wind.speed,
      direction_deg: d.wind.deg,
    },

    sun: {
      sunrise_unix: d.sys.sunrise,
      sunset_unix: d.sys.sunset,
    },

    meta: {
      data_calculated_at_unix: d.dt,
    },
  };
}

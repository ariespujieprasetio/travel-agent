import axios from "axios";

const CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall";

export async function getWeather(city: string) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  console.log("🌤️ Fetching weather (parallel) for:", city);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);

  try {

    const currentPromise = axios.get(CURRENT_URL, {
      params: { q: city, appid: apiKey, units: "metric" },
      signal: controller.signal
    });

    const forecastPromise = axios.get(FORECAST_URL, {
      params: { q: city, appid: apiKey, units: "metric" },
      signal: controller.signal
    });

    // 🔥 JALANIN PARALEL
    const [currentRes, forecastRes] = await Promise.all([
      currentPromise,
      forecastPromise
    ]);

    const c = currentRes.data;
    const forecast = forecastRes.data.list;

    let alerts: any[] = [];

    try {
      const alertRes = await axios.get(ONECALL_URL, {
        params: {
          lat: c.coord.lat,
          lon: c.coord.lon,
          appid: apiKey,
          units: "metric",
          exclude: "minutely,hourly,daily",
        },
        signal: controller.signal
      });

      alerts = alertRes.data.alerts || [];
    } catch {
      console.log("⚠️ Weather alerts skipped");
    }

    clearTimeout(timeout);

    const rainSoon = forecast.slice(0, 8).some((f: any) =>
      f.weather[0].main.toLowerCase().includes("rain")
    );

    const cloudCover = c.clouds.all;
    const hot = c.main.feels_like > 32;
    const windy = c.wind.speed > 8;

    return {
      location: {
        city: c.name,
        country: c.sys.country,
        coordinates: { lat: c.coord.lat, lon: c.coord.lon },
        timezone_offset_sec: c.timezone,
      },
      current: {
        condition: c.weather[0].main,
        description: c.weather[0].description,
        temperature_c: c.main.temp,
        feels_like_c: c.main.feels_like,
        humidity_percent: c.main.humidity,
        wind_speed_mps: c.wind.speed,
        cloud_coverage_percent: c.clouds.all,
        visibility_km: c.visibility ? (c.visibility / 1000) : null, // 🔥 TAMBAH INI
      },
      forecast_summary: forecast.slice(0, 8).map((f: any) => ({
        time_unix: f.dt,
        temp_c: f.main.temp,
        condition: f.weather[0].main,
      })),
      alerts: alerts.map(a => ({
        event: a.event,
        start_unix: a.start,
        end_unix: a.end,
      })),
      insights: {
        umbrellaRecommended: rainSoon,
        heatWarning: hot,
        windAdvisory: windy,
        goodSunsetVisibility: cloudCover < 40,
      }
    };

  } catch (err) {
    console.log("⚠️ Weather skipped (timeout)");
    return null; // ❗️JANGAN THROW
  }
}

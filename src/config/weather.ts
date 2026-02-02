import axios from "axios";

const CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const ONECALL_URL = "https://api.openweathermap.org/data/3.0/onecall";

export async function getWeather(city: string) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY not found!");

  console.log("🌤️ Fetching full weather stack for:", city);

  const currentRes = await axios.get(CURRENT_URL, {
    params: { q: city, appid: apiKey, units: "metric" },
  });

  const c = currentRes.data;

  const forecastRes = await axios.get(FORECAST_URL, {
    params: { q: city, appid: apiKey, units: "metric" },
  });

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
    });

    alerts = alertRes.data.alerts || [];
  } catch (e) {
    console.log("⚠️ No weather alerts available");
  }

  const forecast = forecastRes.data.list;

  const rainSoon = forecast.slice(0, 8).some((f: any) =>
    f.weather[0].main.toLowerCase().includes("rain")
  );

  const cloudCover = c.clouds.all;
  const hot = c.main.feels_like > 32;
  const windy = c.wind.speed > 8;

  const insights = {
    goodForBeach: !rainSoon && cloudCover < 50,
    umbrellaRecommended: rainSoon,
    heatWarning: hot,
    windAdvisory: windy,
    goodSunsetVisibility: cloudCover < 40,
  };

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
      icon: c.weather[0].icon,
      temperature_c: c.main.temp,
      feels_like_c: c.main.feels_like,
      min_c: c.main.temp_min,
      max_c: c.main.temp_max,
      humidity_percent: c.main.humidity,
      pressure_hpa: c.main.pressure,
      cloud_coverage_percent: c.clouds.all,
      visibility_km: c.visibility / 1000,
      wind_speed_mps: c.wind.speed,
      wind_direction_deg: c.wind.deg,
      sunrise_unix: c.sys.sunrise,
      sunset_unix: c.sys.sunset,
      last_updated_unix: c.dt,
    },

    forecast_summary: forecast.slice(0, 8).map((f: any) => ({
      time_unix: f.dt,
      temp_c: f.main.temp,
      condition: f.weather[0].main,
      description: f.weather[0].description,
      rain_probability: f.pop,
    })),

    alerts: alerts.map(a => ({
      event: a.event,
      start_unix: a.start,
      end_unix: a.end,
      description: a.description,
    })),

    insights, 
  };
}

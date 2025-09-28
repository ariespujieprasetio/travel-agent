import axios from 'axios';

// URL for OpenWeather API
const OPENWEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Function to get weather information for a given city
export async function getWeather(city: string): Promise<string> {
  const apiKey = process.env.OPENWEATHER_API_KEY; // Ensure the API key is in the .env file
  if (!apiKey) {
    throw new Error('OPENWEATHER_API_KEY not found!');
  }

  try {
    const response = await axios.get(OPENWEATHER_API_URL, {
      params: {
        q: city,
        appid: apiKey,
        units: 'metric', 
      },
    });

    const data = response.data;
    const weatherDescription = data.weather[0].description;
    const temperature = data.main.temp;
    return `The weather in ${city} is currently ${weatherDescription} with a temperature of ${temperature}°C.`;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return 'Unable to fetch weather data at the moment.';
  }
}

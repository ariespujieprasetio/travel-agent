// places.ts
interface Location {
  latitude: number;
  longitude: number;
}

interface Place {
  formattedAddress: string;
  location: Location;
  rating: number;
  googleMapsUri: string;
  websiteUri?: string;
  displayName: { text: string; languageCode: string };
}

export async function calculate_distance(
  route: { origin: string; destination: string }[],
  mode: string,
  returnTotals: boolean
): Promise<any> {
  // Dummy implementation
  const result = route.map((segment, i) => ({
    origin: segment.origin,
    destination: segment.destination,
    distance: `${10 + i} km`,
    duration: `${15 + i * 5} mins`,
  }));

  if (returnTotals) {
    return {
      totalDistance: `${result.length * 10} km`,
      totalDuration: `${result.length * 15} mins`,
    };
  }

  return result;
}

export async function find_travel_destinations(city: string, count: number): Promise<Place[]> {
  return Array(count).fill(0).map((_, i) => ({
    formattedAddress: `${city} Destination Address ${i + 1}`,
    location: { latitude: -6.2 + i * 0.01, longitude: 106.8 + i * 0.01 },
    rating: 4.0 + Math.random(),
    googleMapsUri: `https://maps.google.com/?q=${city}+place+${i + 1}`,
    displayName: { text: `Tourist Spot ${i + 1}`, languageCode: "en" },
  }));
}

export async function find_restaurants(city: string, cuisine: string, count: number): Promise<Place[]> {
  return Array(count).fill(0).map((_, i) => ({
    formattedAddress: `${city} Restaurant ${cuisine} ${i + 1}`,
    location: { latitude: -6.2 + i * 0.01, longitude: 106.8 + i * 0.01 },
    rating: 4.2 + Math.random(),
    googleMapsUri: `https://maps.google.com/?q=${city}+${cuisine}+restaurant+${i + 1}`,
    websiteUri: `https://restaurant${i + 1}.example.com`,
    displayName: { text: `${cuisine} Restaurant ${i + 1}`, languageCode: "en" },
  }));
}

export async function find_nightlife(city: string, type: string, count: number): Promise<Place[]> {
  return Array(count).fill(0).map((_, i) => ({
    formattedAddress: `${city} ${type} Venue ${i + 1}`,
    location: { latitude: -6.2 + i * 0.01, longitude: 106.8 + i * 0.01 },
    rating: 4.1 + Math.random(),
    googleMapsUri: `https://maps.google.com/?q=${city}+${type}+nightlife+${i + 1}`,
    displayName: { text: `${type} Venue ${i + 1}`, languageCode: "en" },
  }));
}

export async function find_meeting_venues(city: string, type: string, count: number): Promise<Place[]> {
  return Array(count).fill(0).map((_, i) => ({
    formattedAddress: `${city} ${type} Venue ${i + 1}`,
    location: { latitude: -6.2 + i * 0.01, longitude: 106.8 + i * 0.01 },
    rating: 4.3 + Math.random(),
    googleMapsUri: `https://maps.google.com/?q=${city}+${type}+venue+${i + 1}`,
    displayName: { text: `${type} Venue ${i + 1}`, languageCode: "en" },
  }));
}

export async function find_top_rated_restaurants(city: string, cuisine: string, count: number): Promise<Place[]> {
  const all = await find_restaurants(city, cuisine, count + 2);
  return all.sort((a, b) => b.rating - a.rating).slice(0, count);
}

export async function find_top_rated_meeting_venues(city: string, type: string, count: number): Promise<Place[]> {
  const all = await find_meeting_venues(city, type, count + 2);
  return all.sort((a, b) => b.rating - a.rating).slice(0, count);
}

export async function find_top_rated_attractions(city: string, count: number): Promise<Place[]> {
  const all = await find_travel_destinations(city, count + 2);
  return all.sort((a, b) => b.rating - a.rating).slice(0, count);
}

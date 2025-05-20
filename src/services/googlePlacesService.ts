import { google } from "googleapis";
import { config } from "../config/env";

// Initialize Google Places API
const places = google.places({
  version: "v1",
  auth: config.google.apiKey,
});

// Define the fields to request from Google Places API
const fields = [
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.dineIn",
  "places.reservable",
  "places.servesLunch",
  "places.servesDinner",
  "places.servesBeer",
  "places.servesWine",
  "places.priceLevel",
  "places.priceRange",
  "places.rating",
  "places.location",
  "places.priceRange",
  "places.priceLevel"
].join(",");

// Define interfaces
export interface Location {
  latitude: number;
  longitude: number;
}

export interface DisplayName {
  text: string;
  languageCode: string;
}

export interface Place {
  formattedAddress: string;
  location: Location;
  rating: number;
  googleMapsUri: string;
  websiteUri?: string;
  displayName: DisplayName;
}

// Haversine formula for calculating distance between coordinates
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of Earth in km
  const toRad = (angle: number): number => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in km
}

// Function to find hotels"
export async function findHotels(city: string, stars: number, nearCBD: boolean): Promise<Place[]> {
  console.log(`Fetching ${stars} stars hotels in ${city}, requested count: 5, ${nearCBD}`);

  if (nearCBD) {

    const cityCBD = city.includes(',') ? city.split(',')[0] : city;

    const cbdAreas = cbdMaps.get(cityCBD.toLocaleLowerCase())

    const cbdArea = cbdAreas?.at(
      Math.floor(Math.random() * cbdAreas.length)
    );

    const data = await places.places.searchText({
      fields: fields,
      requestBody: {
        textQuery: `${stars} stars hotel in ${cbdArea}`,
        maxResultCount: 5,
      },
    });
    const placesData = data.data.places! as Place[];
    console.log(`Retrieved ${placesData.length} hotels in cbdArea ${cbdArea}`);
    return placesData;
  }

  const data = await places.places.searchText({
    fields: fields,
    requestBody: {
      textQuery: `${stars} stars hotel in ${city}`,
      maxResultCount: 5,
    },
  });
  const placesData = data.data.places! as Place[];
  console.log(`Retrieved ${placesData.length} hotels in ${city}`);
  return placesData;
}

// Function to find restaurants
export async function findRestaurants(
  city: string,
  cuisine: string,
  count: number = 3
): Promise<Place[]> {
  console.log(`Fetching ${cuisine} restaurants in ${city}, requested count: ${count}`);
  const data = await places.places.searchText({
    fields: fields,
    requestBody: {
      textQuery: `${cuisine} restaurants in ${city}`,
      maxResultCount: count,
    },
  });
  const placesData = data.data.places! as Place[];
  console.log(`Retrieved ${placesData.length} ${cuisine} restaurants in ${city}`);
  return placesData;
}

// Function to find nightlife venues
export async function findNightlife(
  city: string,
  type: string,
  count: number = 3
): Promise<Place[]> {
  console.log(`Fetching ${type} nightlife venues in ${city}, requested count: ${count}`);
  const data = await places.places.searchText({
    fields: fields,
    requestBody: {
      textQuery: `${type} in ${city}`,
      maxResultCount: count,
    },
  });
  const placesData = data.data.places! as Place[];
  console.log(`Retrieved ${placesData.length} ${type} nightlife venues in ${city}`);
  return placesData;
}

// Function to find meeting venues
export async function findMeetingVenues(
  city: string,
  type: string,
  count: number = 3
): Promise<Place[]> {
  console.log(`Fetching ${type} meeting venues in ${city}, requested count: ${count}`);
  const data = await places.places.searchText({
    fields: fields,
    requestBody: {
      textQuery: `${type} in ${city}`,
      maxResultCount: count,
    },
  });
  const placesData = data.data.places! as Place[];
  console.log(`Retrieved ${placesData.length} ${type} meeting venues in ${city}`);
  return placesData;
}

// Function to find travel destinations
export async function findTravelDestinations(
  city: string,
  count: number
): Promise<Place[]> {
  console.log(`Fetching tourist attractions in ${city}, requested count: ${count}`);
  const data = await places.places.searchText({
    fields: fields,
    requestBody: {
      textQuery: `tourist attractions in ${city}`,
      maxResultCount: count,
    },
  });
  const placesData = data.data.places! as Place[];
  console.log(`Retrieved ${placesData.length} tourist attractions in ${city}`);
  return placesData;
}

/**
 * Asynchronous function to identify available car rental services in a specified city
 * @param city - The target geographic location for car rental services
 * @param count - Maximum number of results to return
 * @returns Promise resolving to an array of Place objects representing car rental services
 */
export async function findCarRentalServices(
  city: string,
  count: number
): Promise<Place[]> {
  console.log(`Initiating search for car rental services in ${city}, requested result count: ${count}`);

  const data = await places.places.searchText({
    fields: fields,
    requestBody: {
      textQuery: `car rental services in ${city}`,
      maxResultCount: count,
    },
  });

  const rentalServicesData = data.data.places! as Place[];
  console.log(`Successfully retrieved ${rentalServicesData.length} car rental service locations in ${city}`);

  return rentalServicesData;
}
import { Client, TravelMode } from "@googlemaps/google-maps-services-js";

// Define Types
export interface RouteSegment {
  origin: string;
  destination: string;
}

export interface DistanceResult {
  origin: string;
  destination: string;
  distanceText: string;
  distanceValue: number; // in meters
  durationText: string;
  durationValue: number; // in seconds
}

/**
 * Calculate distance between multiple route segments
 * @param route Array of route segments with origin and destination
 * @param mode Travel mode (default: driving)
 * @returns Promise resolving to an array of distance results
 */
export async function calculateDistance(
  route: RouteSegment[],
  mode: TravelMode = TravelMode.driving
): Promise<DistanceResult[]> {
  const client = new Client({});
  const results: DistanceResult[] = [];

  console.log(`Calculating distances for ${route.length} route segments using ${mode} mode`);

  try {
    // Process each segment sequentially
    for (const { origin, destination } of route) {
      console.log(`Calculating distance from ${origin} to ${destination}`);
      
      const response = await client.distancematrix({
        params: {
          origins: [origin],
          destinations: [destination],
          mode: mode,
          key: config.google.apiKey
        },
        timeout: 3000, // milliseconds
      });

      // Extract data from response
      const element = response.data.rows[0].elements[0];
      
      if (element.status === 'OK') {
        results.push({
          origin,
          destination,
          distanceText: element.distance.text,
          distanceValue: element.distance.value,
          durationText: element.duration.text,
          durationValue: element.duration.value
        });
        
        console.log(`Distance: ${element.distance.text}, Duration: ${element.duration.text}`);
      } else {
        console.error(`Error calculating distance for segment: ${element.status}`);
        // Add partial result with error information
        results.push({
          origin,
          destination,
          distanceText: 'Error',
          distanceValue: 0,
          durationText: 'Error',
          durationValue: 0
        });
      }
    }
    
    console.log(`Successfully calculated distances for ${results.length} route segments`);
    return results;
    
  } catch (error: any) {
    console.error(`Error in distance calculation: ${error.message || error}`);
    if (error.response?.data?.error_message) {
      console.error(`Google API error: ${error.response.data.error_message}`);
    }
    throw error;
  }
}

/**
 * Calculate the total distance and duration for a complete route
 * @param routeSegments Array of route segments
 * @param mode Travel mode
 * @returns Promise resolving to total distance and duration
 */
export async function calculateTotalRouteDistance(
  routeSegments: RouteSegment[],
  mode: TravelMode = TravelMode.driving
): Promise<{totalDistanceKm: number, totalDurationMinutes: number}> {
  const segmentResults = await calculateDistance(routeSegments, mode);
  
  // Sum up all distance and duration values
  const totalDistanceMeters = segmentResults.reduce((sum, segment) => sum + segment.distanceValue, 0);
  const totalDurationSeconds = segmentResults.reduce((sum, segment) => sum + segment.durationValue, 0);
  
  // Convert to more readable units
  const totalDistanceKm = Math.round(totalDistanceMeters / 100) / 10; // Round to 1 decimal place
  const totalDurationMinutes = Math.round(totalDurationSeconds / 60);
  
  console.log(`Total route distance: ${totalDistanceKm} km, duration: ${totalDurationMinutes} minutes`);
  
  return { totalDistanceKm, totalDurationMinutes };
}

// Example usage:
/*
const route = [
  { origin: "Paris CDG Airport", destination: "31 Av. George V, 75008 Paris, France" },
  { origin: "31 Av. George V, 75008 Paris, France", destination: "Av. Gustave Eiffel, 75007 Paris, France" },
  { origin: "Av. Gustave Eiffel, 75007 Paris, France", destination: "Tuileries Garden, 75001 Paris, France" },
  { origin: "Tuileries Garden, 75001 Paris, France", destination: "Le Confidentiel, 75001 Paris, France" }
];

// Get detailed results for each segment
calculateDistance(route).then(results => console.log(results));

// Get total route distance and duration
calculateTotalRouteDistance(route).then(total => console.log(total));
*/
// Helper function to find places by rating
async function findPlacesByRating(
  city: string,
  type: string,
  minRating: number = 4.0,
  count: number = 3
): Promise<Place[]> {
  const requestCount = count * 2; // Fetch more to filter by rating
  console.log(`Fetching ${type} in ${city} with min rating ${minRating}, requested count: ${requestCount}`);

  const data = await places.places.searchText({
    fields: fields,
    requestBody: {
      textQuery: `${type} in ${city}`,
      maxResultCount: requestCount,
    },
  });

  let placesData = data.data.places! as Place[];
  // console.log(`Retrieved ${placesData.length} ${type} in ${city} before filtering`);

  // // Filter by rating and sort by highest rating
  // placesData = placesData
  //   .filter(place => place.rating && place.rating >= minRating)
  //   .sort((a, b) => (b.rating || 0) - (a.rating || 0))
  //   .slice(0, count);

  // console.log(`Filtered to ${placesData.length} ${type} in ${city} with rating >= ${minRating}`);

  return placesData;
}

// Function to find top-rated hotels
export async function findTopRatedHotels(
  city: string,
  stars: number,
  count: number = 3
): Promise<Place[]> {
  return findPlacesByRating(city, `${stars} stars hotel`, 4.0, count);
}

// Function to find top-rated restaurants
export async function findTopRatedRestaurants(
  city: string,
  cuisine: string,
  count: number = 3
): Promise<Place[]> {
  return findPlacesByRating(city, `${cuisine} restaurant`, 4.0, count);
}

// Function to find top-rated meeting venues
export async function findTopRatedMeetingVenues(
  city: string,
  type: string,
  count: number = 3
): Promise<Place[]> {
  return findPlacesByRating(city, `${type}`, 4.0, count);
}

// Function to find top-rated attractions
export async function findTopRatedAttractions(
  city: string,
  count: number = 5
): Promise<Place[]> {
  return findPlacesByRating(city, "tourist attraction", 4.0, count);
}

/**
 * Central Business Districts HashMap Implementation
 * 
 * This implementation creates a comprehensive mapping of cities to their
 * respective business districts as extracted from the Wikipedia data.
 * Data is organized by continent and city, facilitating efficient lookups.
 */

interface CityBusinessDistricts {
  [city: string]: string[];
}

// Main data structure: HashMap mapping cities to their business districts
const centralBusinessDistricts: CityBusinessDistricts = {
  // Africa
  "Abidjan": ["Le Plateau"],
  "Abuja": ["Central District"],
  "Accra": ["Accra Central Business District (West Ridge, North Ridge, Osu Tudu, Victoriaborg)", "Airport City"],
  "Addis Ababa": ["Gofa Sefer"],
  "Alexandria": ["Downtown"],
  "Algiers": ["Bab Ezzouar"],
  "Bloemfontein": ["Bloemfontein Central"],
  "Cairo": ["Central Business District"],
  "Cape Town": ["Central Business District", "Century City", "Claremont", "Bellville"],
  "Casablanca": ["Boulevard Des FAR", "Twin Center", "Province of Nouaceur"],
  "Dakar": ["Plateau"],
  "Dar es Salaam": ["Ilala"],
  "Douala": ["Bonanjo"],
  "Durban": ["Central Business District", "Pinetown", "uMhlanga"],
  "Gaborone": ["iTowers of Masa Square CBD"],
  "Harare": ["Downtown"],
  "Johannesburg": ["Central Business District", "Sandton", "Rosebank", "Marlboro", "Kempton Park", "Midrand"],
  "Kampala": ["Nakasero"],
  "Khartoum": ["Downtown"],
  "Kinshasa": ["La Gombe"],
  "Lagos": ["Victoria Island", "Lagos Island", "Eko"],
  "Luanda": ["Ingombota"],
  "Maputo": ["Downtown"],
  "Mombasa": ["Mombasa Island"],
  "Monrovia": ["Downtown/Central"],
  "Nairobi": ["Central Business District", "Upper Hill"],
  "Port Louis": ["Area around Caudan Waterfront"],
  "Pretoria": ["Central Business District", "Hatfield", "Centurion"],
  "Tripoli": ["Central Business District"],
  "Tunis": ["Avenue Habib Bourguiba", "Avenue Mohammed-V"],
  "Windhoek": ["Central Business District"],

  // Asia
  "Ahmedabad and Gandhinagar": ["Gujarat International Finance Tec-City"],
  "Almaty": ["Almaly District", "around Panfilov Park"],
  "Amman": ["Abdali"],
  "Ankara": ["Söğütözü", "Çukurambar"],
  "Bacolod": ["Capitol Central", "The Upper East"],
  "Baku": ["Sabail", "Keshla"],
  "Bangalore": ["MG Road", "Shivajinagar", "Bangalore Central Business District"],
  "Bandung": ["Asia-Africa"],
  "Bangkok": ["Sathorn", "Silom", "Phloenchit", "Asok", "Phraram 9", "Phetchaburi"],
  "Beijing": ["Beijing CBD", "Beijing Financial Street"],
  "Bhopal": ["Shrishti CBD", "New Market", "MP Nagar"],
  "Beirut": ["Hamra Street", "Beirut Central District"],
  "Bokaro Steel City": ["City Centre, Bokaro", "Sector 4 (Bokaro)", "Chas"],
  "Busan": ["Busanjin", "Jung", "Haeundae"],
  "Cagayan de Oro": ["Downtown"],
  "Can Tho": ["Ninh Kieu District"],
  "Chandigarh": ["Sector 17"],
  "Chennai": ["Anna Salai", "T Nagar", "Parry's Corner", "Nungambakkam"],
  "Chiang Mai": ["Chang Khlan Road (Chiang Mai Night Bazaar)", "Airport Business Park", "Chiang Mai Business Park"],
  "Chiba": ["Chūō-ku", "Mihama"],
  "Chittagong": ["Agrabad"],
  "Chongqing": ["Jeifangbei Downtown", "Jiangbei New City CBD"],
  "Coimbatore": ["Avinashi Road", "Gandhipuram", "RS Puram"],
  "Colombo": ["Fort", "Port City Colombo"],
  "Davao City": ["Davao Park District", "Abreeza Ayala Center", "Azuela Cove", "Pryce Business Park", "Davao Global Township"],
  "Daegu": ["Jung", "Daegu-Gyeongbuk Free Economic Zone"],
  "Daejeon": ["Jung", "Seo (Dunsan)"],
  "Dalian": ["Dalian CBD"],
  "Da Nang": ["Hai Chau District"],
  "Dhaka": ["Motijheel", "Kawran Bazar-Panthapath", "Dhanmondi", "Paltan", "Tejgaon I/A", "Gulistan", "Gulshan-Banani/DOHS", "Jatrabari", "Shantinagar", "Mirpur/DOHS", "Mogbazar", "Old Dhaka (including Wari, Sadarghat, Nawbpur, Chawk Bazar and Kotwali)", "Mohakhali/DOHS"],
  "Doha": ["West Bay"],
  "Dubai": ["Downtown", "Jumeirah Lake Towers", "Business Bay", "Dubai Media City"],
  "Erbil": ["Martyr Akram Overpass"],
  "Faisalabad": ["D Ground"],
  "Fukuoka": ["Chūō-ku (Tenjin, Daimyō)", "Hakata-ku (Nakasu, Canal City Hakata, Area around Hakata Station)"],
  "George Town": ["George Town Central Business District"],
  "Guangzhou": ["Tianhe (Zhujiang New Town)", "Yuexiu"],
  "Hai Phong": ["Ngo Quyen District"],
  "Hanoi": ["Hoan Kiem District"],
  "Hatyai": ["Hatyai Nai"],
  "Hefei": ["Swan Lake CBD", "Luyang District"],
  "Ho Chi Minh City": ["District 1", "Thủ Thiêm New Urban Area", "Phú Mỹ Hưng New Urban Area"],
  "Hong Kong": ["Central", "Wan Chai", "Admiralty", "West Kowloon", "Tsim Sha Tsui", "Kwun Tong"],
  "Hiroshima": ["Naka"],
  "Hyderabad": ["Nampally", "HITEC City", "Nanakramguda", "Manikonda", "Gachibowli", "Koti", "Himayatnagar", "Basheerbagh", "Abids"],
  "Iloilo City": ["Downtown", "Iloilo Business Park", "Atria Park District", "Smallville Business Complex"],
  "Incheon": ["Jung", "Incheon Free Economic Zone (Songdo International City, Yeongjong Island, Cheongna)"],
  "Islamabad": ["Jinnah Avenue", "Blue Area"],
  "Istanbul": ["Levent", "Maslak", "Ataşehir", "Istanbul Financial Center"],
  "Jakarta": ["Golden Triangle of Jakarta (including Mega Kuningan and Sudirman Central Business District)"],
  "Jerusalem": ["Jaffa Road", "Downtown Triangle"],
  "Johor Bahru": ["Johor Bahru Central Business District, located in Jalan Wong Ah Fook, near the Johor-Singapore Causeway"],
  "Kaohsiung": ["Cianjin", "Lingya", "Sinsing"],
  "Karachi": ["Serai Quarter", "Shara-e-Faisal", "Clifton"],
  "Kobe": ["Chūō-ku", "Port Island", "Hyōgo-ku", "Rokkō Island", "Area around Kōbe Station"],
  "Kochi": ["Area around M.G Road", "Edappally Lulu International Shopping Mall"],
  "Kolkata": ["Located in B.B.D. Bagh and Esplanade"],
  "Kota Kinabalu": ["Kota Kinabalu Central Business District"],
  "Kuala Lumpur": ["Kuala Lumpur City Centre", "Tun Razak Exchange", "Bukit Bintang", "Jalan Tunku Abdul Rahman", "Jalan Raja Chulan", "Damansara Town Centre", "Mid Valley City", "KL Sentral"],
  "Kuching": ["Downtown Kuching"],
  "Kyoto": ["Nakagyō (Shijō Kawaramachi)", "Shimogyō (Area around Kyoto Tower and Kyōto Station)"],
  "Laguna": ["Southwoods City", "Nuvali", "Greenfield"],
  "Lahore": ["Lahore CBD", "Ferozepur Road", "M. M. Alam road", "Gulberg, Lahore"],
  "Medan": ["Medan Barat", "Medan Petisah", "Medan Polonia"],
  "Metro Cebu": ["Downtown", "Cebu Park District (Cebu Business Park, Cebu IT Park)", "South Road Properties", "Mandani Bay", "The Mactan Newtown"],
  "Metro Clark": ["Clark Global City", "New Clark City"],
  "Metro Manila": ["Makati CBD", "Ortigas Center", "Bonifacio Global City", "Alabang (Filinvest City, Ayala Alabang)", "Bay City", "Triangle Park", "Arca South", "Binondo CBD", "Eastwood City", "Araneta Center"],
  "Mumbai": ["Downtown Historic Centre (Nariman Point - Cuffe Parade - Colaba - Fort)", "Central Mumbai (Worli - Lower Parel - Mumbai Central area combined)"],
  "Narayanganj": ["Chashara"],
  "Navi Mumbai": ["CBD Belapur", "Vashi", "Dighe-Airoli"],
  "Nagoya": ["Naka (Sakae)", "Nakamura (Area around Nagoya Station)"],
  "New Delhi": ["Central Delhi (Connaught Place - Barakhamba Road)", "Nehru Place", "Netaji Subhash Place", "Pitampura", "Bhikaji Cama Place", "RK Puram", "Rajendra Place", "Rajinder Nagar", "Janakpuri District Centre"],
  "New Taipei": ["Xinban Special District", "Xinzhuang Sub-city Center"],
  "Osaka": ["Shinimamiya (Umeda, Dōjima)", "Chūō-ku", "Suminoe", "Minato", "Naniwa"],
  "Pattaya": ["Pattaya Sai 1 and Sai 2"],
  "Petaling Jaya": ["Damansara Utama", "Mutiara Damansara", "Section 52"],
  "Ramat Gan": ["Diamond Exchange District"],
  "Rawalpindi": ["Saddar, Rawalpindi"],
  "Riyadh": ["King Abdullah Financial District"],
  "Roxas": ["Pueblo de Panay"],
  "San Fernando": ["Capital Town Pampanga"],
  "Sapporo": ["Chūō-ku"],
  "Sendai": ["Aoba"],
  "Seoul": ["Downtown Seoul", "Gangnam", "Yeouido"],
  "Shanghai": ["The Bund", "Lujiazui", "People's Square", "Jing'an District", "Xujiahui"],
  "Shah Alam": ["Turmalin Castle"],
  "Shenzhen": ["Around Luohu District's Shennan East Road", "Futian District Lianhuashan Park Southern area till Shenzhen Convention and Exhibition Center", "Nanshan District Houhai company base and Qianhai Shenzhen-Hong Kong Modern Service Industry Cooperation Zone"],
  "Singapore": ["Downtown Core"],
  "Surabaya": ["Tunjungan"],
  "Sylhet": ["Zindabazar"],
  "Tagum": ["Palm City"],
  "Taichung": ["7th Redevelopment Zone"],
  "Taipei": ["Xinyi Planning District", "Nangang", "Da'an", "Datong", "Zhongzheng (Area around Taipei Main Station)"],
  "Taiyuan": ["Changfeng Business District"],
  "Taoyuan": ["Zhongzheng Arts and Cultural Business District", "Qingpu Special District"],
  "Tashkent": ["Tashkent City IBC"],
  "Semarang": ["Simpang Lima City Center", "Pemuda Central Business District", "Gajahmada Golden Triangle"],
  "Tehran": ["Sadeghiyeh", "Gheytarieh", "Navvab (district)"],
  "Tel Aviv": ["Ayalon"],
  "Trivandrum": ["MG Road", "East Fort"],
  "Tokyo": ["Marunouchi", "Ōtemachi", "Hibiya", "Yūrakuchō", "Shinbashi", "Shiodome", "Nihonbashi", "Kyōbashi", "Roppongi", "Akasaka", "Shibuya", "Nishi-Shinjuku", "Shinjuku", "Shinagawa"],
  "Ulaanbaatar": ["Near Sukhbaatar Square"],
  "Visakhapatnam": ["Dwaraka Nagar", "Daba Gardens", "Asilmetta", "Siripuram"],
  "Yerevan": ["Kentron District"],
  "Yokohama": ["Minato Mirai 21", "Naka", "Area around Yokohama Station"],

  // Europe
  "Aarhus": ["Aarhus C"],
  "Amsterdam": ["Amsterdam-Centrum", "Omval", "Teleport", "Zuidas"],
  "Barcelona": ["Diagonal Mar", "Gran Via", "22@"],
  "Belfast": ["City Centre"],
  "Belgrade": ["Krunski Venac", "Novi Beograd"],
  "Berlin": ["Charlottenburg-Wilmersdorf (Kurfürstendamm, Area around Bahnhof Zoo)", "Mitte (Alexanderplatz, Potsdamer Platz)"],
  "Bern": ["Old City"],
  "Birmingham": ["City Centre", "Colmore Row", "Westside and Bull Ring"],
  "Bologna": ["Fiera District"],
  "Bournemouth": ["Town Centre"],
  "Bratislava": ["Bratislava Ružinov - Nivy"],
  "Brescia": ["Brescia Due"],
  "Bristol": ["Bristol city centre"],
  "Brussels": ["Quartier Léopold", "Quartier Nord", "Zaventem"],
  "Bucharest": ["Piaţa Victoriei", "Floreasca Business Centre/Pipera Business Centre"],
  "Budapest": ["Leopoldtown-Inner City", "Angel's Field"],
  "Cardiff": ["City Centre"],
  "Cologne": ["Innenstadt"],
  "Copenhagen": ["Indre By"],
  "Cork": ["City Centre"],
  "Dortmund": ["Downtown"],
  "Dresden": ["Old town"],
  "Dublin": ["2/4 Districts", "IFSC"],
  "Düsseldorf": ["Stadtmitte"],
  "Edinburgh": ["Edinburgh Park", "George Street"],
  "Essen": ["Südviertel"],
  "Frankfurt": ["Bankenviertel"],
  "Geneva": ["Cité-centre"],
  "Genoa": ["San Benigno"],
  "Ghent": ["Sint-Denijs Western"],
  "Glasgow": ["City Centre"],
  "The Hague": ["Beatrixkwartier"],
  "Hamburg": ["Mitte"],
  "Helsinki": ["Helsinki City Centre"],
  "Iași": ["Civic Centre", "Palas"],
  "Katowice": ["Śródmieście, Katowice"],
  "Kyiv": ["Lypky", "Pechersk"],
  "Lille": ["Euralille"],
  "Lisbon": ["Av da Liberdade", "Parque das Nações"],
  "Liverpool": ["City Centre"],
  "London": ["City of London", "London Docklands", "West End"],
  "Lugano": ["Lugano Centro"],
  "Lyon": ["Part-Dieu"],
  "Luxembourg City": ["Kirchberg"],
  "Madrid": ["AZCA", "CTBA", "Gran Vía"],
  "Malmö": ["Centrum"],
  "Manchester": ["Spinningfields", "City Centre"],
  "Marseille": ["Euroméditerranée"],
  "Milan": ["Porta Nuova District", "CityLife", "Zona 1", "Zona 2"],
  "Milton Keynes": ["Central Milton Keynes"],
  "Moscow": ["Moscow International Business Center", "Presnya"],
  "Monaco": ["Monaco"],
  "Munich": ["Altstadt-Lehel", "Ludwigsvorstadt-Isarvorstadt", "Maxvorstadt"],
  "Nancy": ["Downtown Nancy"],
  "Nantes": ["Euronantes"],
  "Naples": ["Centro Direzionale"],
  "Nicosia": ["City Centre"],
  "Oslo": ["Sentrum"],
  "Paris": ["La Défense", "Val de Seine", "Front de Seine"],
  "Podgorica": ["Roman Square"],
  "Prague": ["Pankrác Plain"],
  "Reykjavík": ["Borgartún (financial district)", "Miðborg (administrative and commercial district)"],
  "Rome": ["EUR", "Monti", "Castro Pretorio"],
  "Rotterdam": ["Rotterdam Centrum/Kop van Zuid"],
  "Saint Petersburg": ["Lakhta Center"],
  "Seville": ["Sevilla Tower"],
  "Sofia": ["Business Park Sofia"],
  "Stockholm": ["Stockholm City Centre"],
  "Strasbourg": ["Wacken (Strasbourg)"],
  "Stuttgart": ["Stuttgart-Mitte", "Stuttgart-Vaihingen (STEP) and Am Wallgraben)", "Stuttgart-Fasanenhof (EnBW-City)"],
  "Tallinn": ["Maakri"],
  "Thessaloniki": ["City Centre"],
  "Tórshavn": ["Tinganes"],
  "Trondheim": ["Midtbyen"],
  "Turku": ["Turku City Centre"],
  "Vantaa": ["Aviapolis"],
  "Vienna": ["Innere Stadt", "Donau City"],
  "Vilnius": ["Vilnius Central Business District"],
  "Warsaw": ["Śródmieście, Warsaw", "Wola"],
  "Yekaterinburg": ["Yekaterinburg-City"],
  "Zagreb": ["Kanal, Zagreb", "Trnje"],
  "Zürich": ["Altstadt", "Zürich-West"],

  // North America
  "Albany": ["Downtown Albany Historic District"],
  "Albuquerque": ["Downtown Albuquerque"],
  "Allentown": ["Center City"],
  "Anchorage": ["Downtown Anchorage"],
  "Athens": ["Downtown Athens", "Andrea Syngrou Avenue", "Athinon Avenue", "Glyfada", "Greek National Road 1", "Hellenikon Metropolitan Park (Under Construction)", "Kifissias Avenue", "Marousi", "Omonoia", "Piraeus", "Sofokleous Street", "Syntagma"],
  "Atlanta": ["Downtown", "Midtown", "Buckhead", "Sandy Springs"],
  "Arlington": ["Rosslyn"],
  "Augusta": ["Augusta Downtown Historic District"],
  "Austin": ["Downtown Austin"],
  "Bakersfield": ["Downtown Bakersfield"],
  "Baltimore": ["Downtown", "Hamilton", "Inner Harbor", "Harbor East", "Towson"],
  "Beaumont": ["Downtown Beaumont"],
  "Bentonville": ["Downtown Bentonville"],
  "Berkeley": ["Downtown Berkeley"],
  "Binghamton": ["Downtown Binghamton"],
  "Boise": ["Downtown Boise"],
  "Boston": ["Downtown", "Back Bay", "Cambridge"],
  "Burnaby": ["Metrotown", "Brentwood", "Edmonds"],
  "Calgary": ["Downtown", "Macleod Trail"],
  "Camden": ["Camden Central Business District"],
  "Charlotte": ["Uptown", "Southpark"],
  "Cheyenne": ["Downtown Cheyenne Historic District"],
  "Chicago": ["Chicago Loop", "Near North Side", "Near West Side", "Golden Corridor", "Illinois Technology and Research Corridor"],
  "Cincinnati": ["Downtown"],
  "Cleveland": ["Downtown", "University Circle"],
  "Columbia": ["Downtown Columbia"],
  "Columbus": ["Downtown"],
  "Columbus, Georgia": ["Downtown"],
  "Compton": ["Downtown"],
  "Culiacán": ["Downtown"],
  "Dallas": ["Downtown", "Platinum Corridor", "Stemmons Corridor"],
  "Dayton": ["Downtown Dayton"],
  "Denver": ["Downtown", "Tech Center"],
  "Des Moines": ["Downtown"],
  "Detroit": ["Financial District", "Southfield"],
  "Duluth": ["Downtown"],
  "Edmonton": ["Downtown"],
  "El Paso": ["Downtown"],
  "Erie": ["Downtown"],
  "Evansville": ["Downtown"],
  "Fort Worth": ["Downtown"],
  "Gary": ["Downtown"],
  "Grand Forks": ["Downtown"],
  "Guadalajara": ["Puerta de Hierro", "Chapultepec Av", "de las Americas Av"],
  "Gatineau": ["Hull Sector"],
  "Guatemala City": ["Zone 1"],
  "Guelph": ["Downtown"],
  "Harrisburg": ["Downtown"],
  "Halifax": ["Downtown", "Downtown Dartmouth"],
  "Hamilton, Ontario": ["King and James"],
  "Hartford": ["Downtown"],
  "Havana": ["Vedado"],
  "Hayward": ["Downtown"],
  "Honolulu": ["Downtown"],
  "Houston": ["Downtown", "Uptown", "Texas Medical Center", "Greenway Plaza", "Energy Corridor", "Greenspoint", "Westchase"],
  "Indianapolis": ["Downtown"],
  "Ithaca": ["Ithaca Commons"],
  "Jacksonville": ["Downtown", "LaVilla", "Brooklyn", "Southbank"],
  "Jersey City": ["Downtown", "Journal Square"],
  "Juneau": ["Juneau Downtown Historic District"],
  "Kansas City": ["Downtown"],
  "Kingston": ["Sydenham Ward"],
  "Knoxville": ["Downtown"],
  "Lansing": ["Downtown"],
  "Laredo": ["Downtown"],
  "Las Vegas": ["Downtown Las Vegas", "Fremont Street"],
  "Lethbridge": ["Downtown"],
  "Long Beach": ["Downtown"],
  "Los Angeles": ["Downtown", "Financial District", "Century City", "Wilshire (Wilshire Center/Koreatown, Miracle Mile)", "Hollywood", "Westwood", "West Los Angeles", "Warner Center"],
  "Louisville": ["Downtown"],
  "Macon": ["Downtown"],
  "Memphis": ["Downtown"],
  "Mexico City": ["Paseo de la Reforma", "City Santa Fe", "Polanco", "Interlomas", "CBD Perisur"],
  "Miami": ["Downtown", "Brickell"],
  "Milwaukee": ["Downtown"],
  "Minneapolis": ["Downtown West, Minneapolis", "Downtown East, Minneapolis"],
  "Mississauga": ["Mississauga City Centre"],
  "Missoula": ["Downtown"],
  "Modesto": ["Downtown"],
  "Monterrey": ["Downtown Monterrey", "San Pedro Garza García", "Valle Oriente"],
  "Montreal": ["Downtown", "Quartier international de Montréal"],
  "New Haven": ["Downtown"],
  "New Orleans": ["CBD"],
  "New York City": ["Midtown Manhattan", "Lower Manhattan", "Downtown Brooklyn", "Flushing", "Long Island City"],
  "Newark": ["Downtown"],
  "Norfolk": ["Downtown"],
  "Oakland": ["Downtown", "Jack London Square"],
  "Oklahoma City": ["Downtown"],
  "Omaha": ["Downtown Omaha"],
  "Orlando": ["Downtown Orlando"],
  "Ottawa": ["Downtown"],
  "Pasadena": ["Downtown"],
  "Paterson": ["Downtown"],
  "Philadelphia": ["Center City", "University City"],
  "Phoenix": ["Downtown"],
  "Pittsburgh": ["Downtown", "Oakland"],
  "Plano": ["Legacy West"],
  "Port of Spain": ["Town"],
  "Portland": ["Downtown", "Lloyd District"],
  "Prince Albert": ["Central Business District or Downtown"],
  "Providence": ["Downtown"],
  "Puebla": ["Angelopolis"],
  "Quebec City": ["Saint-Roch", "Sainte-Foy", "Lévis"],
  "Regina": ["Downtown"],
  "Richmond, Canada": ["Area around City Centre"],
  "Richmond, US": ["Downtown"],
  "Roanoke": ["Downtown"],
  "Rochester": ["Downtown"],
  "Sacramento": ["Downtown"],
  "Saint Paul": ["Downtown"],
  "Salt Lake City": ["Downtown Salt Lake City (City Creek Center)", "Central City"],
  "San Antonio": ["Downtown"],
  "San Bernardino": ["Downtown", "Hospitality Lane"],
  "San Diego": ["Downtown", "La Jolla", "University City", "Rancho Bernardo", "Carmel Valley", "Mission Valley", "Sorrento Mesa", "Del Mar Heights"],
  "San Francisco": ["Financial District"],
  "San Jose": ["Downtown"],
  "San Juan": ["Hato Rey"],
  "San Salvador": ["District 3"],
  "Santo Domingo": ["Polígono Central"],
  "Saskatoon": ["Central Business District"],
  "Seattle": ["Downtown", "South Lake Union"],
  "Schenectady": ["Downtown"],
  "South Bend": ["Downtown"],
  "Spokane": ["Downtown"],
  "Springfield": ["Metro Center"],
  "St. Catharines": ["Downtown"],
  "St. John's": ["Downtown"],
  "St. Louis": ["Downtown", "Downtown Clayton"],
  "Stamford": ["Downtown"],
  "Syracuse": ["Downtown"],
  "Surrey": ["Whalley"],
  "Tacoma": ["Downtown"],
  "Tampa": ["Downtown", "Uptown", "Westshore"],
  "Thunder Bay": ["Downtown Fort William"],
  "Tijuana": ["Zona Río"],
  "Toledo": ["Downtown"],
  "Toronto": ["Downtown", "Midtown", "North York City Centre", "Scarborough City Centre", "Islington-City Centre West"],
  "Tulsa": ["Downtown"],
  "Vancouver": ["Downtown"],
  "Vaughan": ["Vaughan Metropolitan Centre"],
  "Victoria": ["Downtown"],
  "Virginia Beach": ["Town Center"],
  "Washington, D.C.": ["Downtown", "NoMa", "Tysons", "Rosslyn", "Ballston", "Pentagon City-Crystal City", "Downtown Bethesda", "Reston Town Center", "Downtown Silver Spring"],
  "Waterbury": ["Downtown"],
  "Whitehorse": ["Downtown"],
  "Wichita": ["Downtown"],
  "Winnipeg": ["Downtown", "Saint Boniface"],

  // Oceania
  "Adelaide": ["Adelaide CBD"],
  "Auckland": ["Auckland CBD"],
  "Brisbane": ["Brisbane CBD"],
  "Canberra": ["Civic"],
  "Christchurch": ["Christchurch Central City"],
  "Darwin": ["Darwin CBD"],
  "Gold Coast": ["Broadbeach", "Surfers Paradise", "Southport"],
  "Hobart": ["Hobart CBD"],
  "Melbourne": ["Melbourne CBD", "Southbank", "Melbourne Docklands", "Box Hill"],
  "Newcastle": ["Wickham", "Hamilton"],
  "Perth": ["Perth CBD"],
  "Suva": ["Central"],
  "Sydney": ["Sydney CBD", "Parramatta", "North Sydney", "Chatswood", "Liverpool", "Barangaroo", "Pyrmont", "Haymarket"],
  "Wellington": ["Wellington Central"],

  // South America
  "Barranquilla": ["Paseo de Bolívar"],
  "Belo Horizonte": ["Avenida Afonso Pena", "Praça Sete", "Avenida Amazonas"],
  "Bogotá": ["Centro Internacional de Bogotá", "Avenida Chile", "Ciudad Salitre", "World Trade Center Calle 100", "Complejo Empresarial Santa Bárbara"],
  "Brasília": ["Eixo Monumental"],
  "Buenos Aires": ["Puerto Madero", "Buenos Aires Central Business District"],
  "Caracas": ["Chacao", "Milla de Oro", "Plaza Venezuela", "Parque Central Complex", "Las Mercedes", "El Rosal", "Altamira", "El Recreo"],
  "Cartagena de Indias": ["Bocagrande"],
  "Lima": ["San Isidro", "Surco (El Derby)", "Downtown Lima"],
  "Medellín": ["El Poblado"],
  "Montería": ["Avenida Primera"],
  "Montevideo": ["Barrio Centro", "Ciudad Vieja"],
  "Quito": ["Iñaquito", "Av. 12 de Octubre", "Av. González Suárez", "Av. Patria", "La Mariscal"],
  "Rio de Janeiro": ["Centro Financeiro do Rio", "Porto Maravilha (under construction)"],
  "São Paulo": ["Paulista Avenue", "Faria Lima", "Brooklin", "Vila Olímpia", "Downtown São Paulo", "Alphaville"],
  "Santiago": ["Sanhattan"]
};

const cbdMaps = new Map<string, string[]>();

for (const key in centralBusinessDistricts) {
  cbdMaps.set(key.toLowerCase(), centralBusinessDistricts[key])
}

import dotenv from "dotenv";
import OpenAI from "openai";
import {
    ChatCompletionMessage,
    ChatCompletionMessageParam,
    ChatCompletionMessageToolCall,
    ChatCompletionTool,
    ChatCompletionToolMessageParam,
    FunctionParameters,
} from "openai/resources";

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.error(
        "Error: OPENAI_API_KEY is not set in the environment variables."
    );
    process.exit(1);
}

const openai = new OpenAI({
    apiKey,
});

import { google } from "googleapis";
import * as fs from "fs";
import { start } from "repl";
const places = google.places("v1");

async function searchPlaces(
    textQuery: string,
    maxResultCount: number
  ): Promise<Place[]> {
  
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_API_KEY!,
          "X-Goog-FieldMask": fields,
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount,
        }),
      }
    );
  
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Places failed: ${res.status} ${text}`);
    }
  
    const data = await res.json();
  
    if (!data.places || data.places.length === 0) {
      throw new Error("No places found");
    }
  
    return data.places as Place[];
  }
  

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
].join(",");

interface Location {
    latitude: number;
    longitude: number;
}

function haversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; 
    const toRad = (angle: number): number => (angle * Math.PI) / 180; 

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; 
}

interface DisplayName {
    text: string;
    languageCode: string;
}

interface Place {
    formattedAddress: string;
    location: Location;
    rating: number;
    googleMapsUri: string;
    websiteUri?: string; 
    displayName: DisplayName;
}

const tools: ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "find_travel_destinations",
            description: "Find tourist attractions in a city",
            parameters: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                        description: "City and country, e.g., 'Bali, Indonesia'",
                    },
                    count: {
                        type: "number",
                        description: "Number of destinations needed to generate itinerary"
                    }
                },
                required: ["city", "count"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "find_hotels",
            description: "Find available hotels in a city",
            parameters: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                        description: "City and country, e.g., 'Bali, Indonesia'",
                    },
                    stars: {
                        type: "number",
                        description: "Minimum number of stars for hotels",
                    },
                },
                required: ["city", "stars"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "find_restaurants",
            description: "Find restaurants of a specific cuisine in a city",
            parameters: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                        description: "City and country, e.g., 'Bali, Indonesia'",
                    },
                    cuisine: {
                        type: "string",
                        description: "Type of cuisine, e.g., 'Indonesian', 'Italian', 'Seafood'",
                    },
                    count: {
                        type: "number",
                        description: "Number of restaurants to find",
                        default: 3
                    }
                },
                required: ["city", "cuisine"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "find_nightlife",
            description: "Find nightlife venues in a city",
            parameters: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                        description: "City and country, e.g., 'Bali, Indonesia'",
                    },
                    type: {
                        type: "string",
                        description: "Type of venue, e.g., 'bar', 'night club', 'lounge'",
                    },
                    count: {
                        type: "number",
                        description: "Number of venues to find",
                        default: 3
                    }
                },
                required: ["city", "type"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "find_meeting_venues",
            description: "Find meeting venues in a city",
            parameters: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                        description: "City and country, e.g., 'Bali, Indonesia'",
                    },
                    type: {
                        type: "string",
                        description: "Type of meeting venue, e.g., 'conference center', 'meeting room', 'co-working space'",
                    },
                    count: {
                        type: "number",
                        description: "Number of venues to find",
                        default: 3
                    }
                },
                required: ["city", "type"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "find_top_rated_hotels",
            description: "Find top-rated hotels in a city based on minimum star rating",
            parameters: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                        description: "City and country, e.g., 'Bali, Indonesia'",
                    },
                    stars: {
                        type: "number",
                        description: "Minimum number of stars for hotels",
                    },
                    count: {
                        type: "number",
                        description: "Number of hotels to find",
                        default: 3
                    }
                },
                required: ["city", "stars"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "find_top_rated_restaurants",
            description: "Find top-rated restaurants of a specific cuisine in a city",
            parameters: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                        description: "City and country, e.g., 'Bali, Indonesia'",
                    },
                    cuisine: {
                        type: "string",
                        description: "Type of cuisine, e.g., 'Indonesian', 'Italian', 'Seafood'",
                    },
                    count: {
                        type: "number",
                        description: "Number of restaurants to find",
                        default: 3
                    }
                },
                required: ["city", "cuisine"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "find_top_rated_meeting_venues",
            description: "Find top-rated meeting venues in a city",
            parameters: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                        description: "City and country, e.g., 'Bali, Indonesia'",
                    },
                    type: {
                        type: "string",
                        description: "Type of meeting venue, e.g., 'conference center', 'meeting room', 'co-working space'",
                    },
                    count: {
                        type: "number",
                        description: "Number of venues to find",
                        default: 3
                    }
                },
                required: ["city", "type"],
                additionalProperties: false,
            },
        },
    },
    {
        type: "function",
        function: {
            name: "find_top_rated_attractions",
            description: "Find top-rated tourist attractions in a city",
            parameters: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                        description: "City and country, e.g., 'Bali, Indonesia'",
                    },
                    count: {
                        type: "number",
                        description: "Number of attractions to find",
                        default: 5
                    }
                },
                required: ["city"],
                additionalProperties: false,
            },
        },
    },
];

const sysprompt = fs.readFileSync('sys-new.txt', 'utf-8')


import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const maps = new Map<number, ChatCompletionMessageParam[]>();

function addMessage(key: number, message: ChatCompletionMessageParam) {
    if (!maps.has(key)) {
        maps.set(key, []); 
    }
    maps.get(key)!.push(message); 

}

async function doInitChat(key: number, emit: (topic: string, data: string) => {}) {
    const history = maps.get(key)!;

    const completion = await openai.chat.completions.create({
        model: "gpt-4o", 
        messages: history,
        tools: tools,
        temperature: 0,
        store: true,
        stream: true,
    });
    let acc = ``

    for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;
        const stop = chunk.choices[0].finish_reason == 'stop'
        acc += delta.content || ""
        if (!delta.tool_calls) {
            process.stdout.write(delta.content || "");
            if (delta.content) {
                emit(`msg-${key}`, `${delta.content}`)
            }
        }

    }

    emit(`msg-${key}`, `\n\0`)

    addMessage(key, { role: "assistant", content: acc });

}

async function doChat(key: number, msg: string, emit: (topic: string, data: string) => {}) {
    if (!maps.has(key)) {
        maps.set(key, [
            { role: "system", content: sysprompt }
        ]);
    }

    const history = maps.get(key)!;

    if (!history.find(h => h.role === 'system')) {
        history.unshift({ role: 'system', content: sysprompt });
    }

    addMessage(key, { role: "user", content: msg });

    try {

        while (true) {

            const completion = await openai.chat.completions.create({
                model: "gpt-4o", 
                messages: history,
                tools: tools,
                temperature: 0,
                store: true,
                stream: true,
            });

            let acc = ``

            let toolId = ``
            let functionName = ``
            let args = ``
            let callFunction = false;
            let toolsCallsDetail = [] as ChatCompletionMessageToolCall[];
            let toolsCalls = [] as ChatCompletionToolMessageParam[];
            let stop = false;

            for await (const chunk of completion) {
                const delta = chunk.choices[0]?.delta;
                stop = chunk.choices[0].finish_reason !== 'stop'
                acc += delta.content || ""
                console.log(chunk);


                if (!delta.tool_calls) {
                    process.stdout.write(delta.content || "");
                    if (delta.content)
                        emit(`msg-${key}`, `${delta.content}`)
                } else {
                    console.log(delta)
                    for (const call of delta.tool_calls) {
                        if (call.function) {
                            if (call.function.name) functionName = call.function.name;
                            if (call.id) toolId = call.id; ``
                            if (call.function.arguments) {

                                args += call.function.arguments;

                                if (args.includes('}')) {
                                    callFunction = true;
                                    const data = JSON.parse(args);
                                    args = ``;
                                    call.id = ``

                                    toolsCallsDetail.push({
                                        function: { name: functionName, arguments: JSON.stringify(data) },
                                        id: toolId,
                                        type: "function"
                                    })
                                    switch (functionName) {
                                        case "find_travel_destinations":
                                            const places = await find_travel_destinations(data.city, data.count);
                                            console.log(places);
                                            toolsCalls.push({ role: "tool", content: JSON.stringify(places), tool_call_id: toolId });
                                            break;

                                        case "find_hotels":
                                            const hotels = await find_hotels(data.city, data.stars);
                                            toolsCalls.push({ role: "tool", content: JSON.stringify(hotels), tool_call_id: toolId });
                                            console.log(hotels);
                                            break;

                                        case "find_restaurants":
                                            const restaurants = await find_restaurants(data.city, data.cuisine, data.count || 3);
                                            toolsCalls.push({ role: "tool", content: JSON.stringify(restaurants), tool_call_id: toolId });
                                            console.log(restaurants);
                                            break;

                                        case "find_nightlife":
                                            const nightlife = await find_nightlife(data.city, data.type, data.count || 3);
                                            toolsCalls.push({ role: "tool", content: JSON.stringify(nightlife), tool_call_id: toolId });
                                            console.log(nightlife);
                                            break;

                                        case "find_meeting_venues":
                                            const meetingVenues = await find_meeting_venues(data.city, data.type, data.count || 3);
                                            toolsCalls.push({ role: "tool", content: JSON.stringify(meetingVenues), tool_call_id: toolId });
                                            console.log(meetingVenues);
                                            break;

                                        case "find_top_rated_hotels":
                                            const topHotels = await find_top_rated_hotels(data.city, data.stars, data.count || 3);
                                            toolsCalls.push({ role: "tool", content: JSON.stringify(topHotels), tool_call_id: toolId });
                                            console.log(topHotels);
                                            break;

                                        case "find_top_rated_restaurants":
                                            const topRestaurants = await find_top_rated_restaurants(data.city, data.cuisine, data.count || 3);
                                            toolsCalls.push({ role: "tool", content: JSON.stringify(topRestaurants), tool_call_id: toolId });
                                            console.log(topRestaurants);
                                            break;

                                        case "find_top_rated_meeting_venues":
                                            const topMeetingVenues = await find_top_rated_meeting_venues(data.city, data.type, data.count || 3);
                                            toolsCalls.push({ role: "tool", content: JSON.stringify(topMeetingVenues), tool_call_id: toolId });
                                            console.log(topMeetingVenues);
                                            break;

                                        case "find_top_rated_attractions":
                                            const topAttractions = await find_top_rated_attractions(data.city, data.count || 5);
                                            toolsCalls.push({ role: "tool", content: JSON.stringify(topAttractions), tool_call_id: toolId });
                                            console.log(topAttractions);
                                            break;

                                        default:
                                            console.error(`Unknown function: ${functionName}`);
                                            break;
                                    }

                                }
                            }

                        }
                    }



                }

            }




            if (!callFunction) {
                addMessage(key, { role: "assistant", content: acc });
                emit(`msg-${key}`, `\n\0`)

                break;

            } else {
                callFunction = false
                addMessage(key, { role: "assistant", content: acc, tool_calls: toolsCallsDetail });

                for (const toolCall of toolsCalls) {
                    addMessage(key, toolCall)
                }
                toolsCallsDetail = []
                toolsCalls = []


            }

        }
    } catch (error) {
        console.error("Error during OpenAI API call:", error);

        console.log(history)
    }


}

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

io.on('connection', (socket: Socket) => {
    console.log('A user connected');

    socket.on('chat message', (data: string) => {
        const { id, msg } = JSON.parse(data);

        if (!maps.has(id)) {
            maps.set(id, [{
                role: "system",
                content: sysprompt,
            },])
            doInitChat(id, (t, d) => io.emit(t, d))
        } else {
            doChat(id, msg, (t, d) => io.emit(t, d))
        }




    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = 5600;
httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


async function find_hotels(
    city: string,
    stars: number
  ): Promise<Place[]> {
    return searchPlaces(`${stars} star hotel in ${city}`, 5);
  }

  async function find_restaurants(
    city: string,
    cuisine: string,
    count: number = 3
  ): Promise<Place[]> {
    return searchPlaces(`${cuisine} restaurant in ${city}`, count);
  }
  
  async function find_nightlife(
    city: string,
    type: string,
    count: number = 3
  ): Promise<Place[]> {
    return searchPlaces(`${type} in ${city}`, count);
  }
  
  async function find_meeting_venues(
    city: string,
    type: string,
    count: number = 3
  ): Promise<Place[]> {
    return searchPlaces(`${type} in ${city}`, count);
  }

  async function find_travel_destinations(
    city: string,
    count: number
  ): Promise<Place[]> {
    return searchPlaces(`tourist attractions in ${city}`, count);
  }
  
  async function find_places_by_rating(
    city: string,
    type: string,
    minRating: number = 4.0,
    count: number = 3
  ): Promise<Place[]> {
  
    const placesData = await searchPlaces(
      `${type} in ${city}`,
      count * 2 
    );
  
    return placesData
      .filter(p => typeof p.rating === "number" && p.rating >= minRating)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, count);
  }
 
  async function find_top_rated_hotels(
    city: string,
    stars: number,
    count: number = 3
  ): Promise<Place[]> {
    return find_places_by_rating(city, `${stars} star hotel`, 4.0, count);
  }
  
  async function find_top_rated_restaurants(
    city: string,
    cuisine: string,
    count: number = 3
  ): Promise<Place[]> {
    return find_places_by_rating(city, `${cuisine} restaurant`, 4.0, count);
  }
  
  async function find_top_rated_meeting_venues(
    city: string,
    type: string,
    count: number = 3
  ): Promise<Place[]> {
    return find_places_by_rating(city, type, 4.0, count);
  }
  
  async function find_top_rated_attractions(
    city: string,
    count: number = 5
  ): Promise<Place[]> {
    return find_places_by_rating(city, "tourist attraction", 4.0, count);
  }
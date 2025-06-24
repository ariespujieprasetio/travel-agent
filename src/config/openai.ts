import OpenAI from "openai";
import { config } from "./env";
import { ChatCompletionTool } from "openai/resources";
import * as fs from "fs";
import path from "path";
import {
  find_hotels_new,
  find_top_rated_hotels_new,
  find_car_rentals,
  search_flights,
} from "./travelpayouts";

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Define the OpenAI tools
export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "calculate_distance",
      description: "Calculate distances and durations between multiple locations in a route",
      parameters: {
        type: "object",
        properties: {
          route: {
            type: "array",
            description: "Array of route segments with origin and destination points",
            items: {
              type: "object",
              properties: {
                origin: {
                  type: "string",
                  description: "Starting location (address, landmark, or coordinates)"
                },
                destination: {
                  type: "string",
                  description: "Ending location (address, landmark, or coordinates)"
                }
              },
              required: ["origin", "destination"]
            }
          },
          mode: {
            type: "string",
            description: "Travel mode for the route calculation",
            enum: ["driving", "walking", "bicycling", "transit"],
            default: "driving"
          },
          returnTotals: {
            type: "boolean",
            description: "Whether to return only total distance/duration or full segment details",
            default: false
          }
        },
        required: ["route"],
        additionalProperties: false
      }
    }
  },
{
    type: "function",
    function: {
      name: "find_hotels",
      description: "Find available hotels in a city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          stars: { type: "number" },
          nearCBD: { type: "boolean" }
        },
        required: ["city", "stars", "nearCBD"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_top_rated_hotels_new",
      description: "Find top-rated hotels in a city based on minimum star rating",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          stars: { type: "number" },
          count: { type: "number", default: 3 }
        },
        required: ["city", "stars"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_car_rentals",
      description: "Identify available vehicle rental services within a specified geographic location",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          count: { type: "number" }
        },
        required: ["city", "count"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_flights",
      description: "Search for cheap flights between two locations",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string" },
          destination: { type: "string" },
          departDate: { type: "string" },
          returnDate: { type: "string" }
        },
        required: ["origin", "destination", "departDate"],
        additionalProperties: false
      }
    }
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

// Read system prompt from file
export function getSystemPrompt(): string {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), 'sys-new.txt'), 'utf-8');
    const match = content.match(/# USER_PROMPT_TEMPLATE([\s\S]*)/);
    return match ? match[1].trim() : "Welcome! Let's start planning your trip.";
  } catch (error) {
    console.error("Error reading user prompt template:", error);
    return "Welcome! Let's start planning your trip.";
  }
}
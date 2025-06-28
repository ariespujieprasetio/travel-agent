import OpenAI from "openai";
import { config } from "./env";
import { ChatCompletionTool } from "openai/resources";
import * as fs from "fs";
import path from "path";

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Define the tools
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
      description: "Search available flights between two locations for given dates",
      parameters: {
        type: "object",
        properties: {
          origin: {
            type: "string",
            description: "Airport code for departure (e.g., 'JOG' or 'CGK')"
          },
          destination: {
            type: "string",
            description: "Airport code for arrival (e.g., 'DPS' or 'JOG')"
          },
          departDate: {
            type: "string",
            description: "Departure date in YYYY-MM-DD format"
          },
          returnDate: {
            type: "string",
            description: "Return date in YYYY-MM-DD format (optional)"
          }
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
          city: { type: "string" },
          cuisine: { type: "string" },
          count: { type: "number", default: 3 }
        },
        required: ["city", "cuisine"],
        additionalProperties: false
      }
    }
  },

  {
    type: "function",
    function: {
      name: "find_nightlife",
      description: "Find nightlife venues in a city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          type: { type: "string" },
          count: { type: "number", default: 3 }
        },
        required: ["city", "type"],
        additionalProperties: false
      }
    }
  },

  {
    type: "function",
    function: {
      name: "find_meeting_venues",
      description: "Find meeting venues in a city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          type: { type: "string" },
          count: { type: "number", default: 3 }
        },
        required: ["city", "type"],
        additionalProperties: false
      }
    }
  },

  {
    type: "function",
    function: {
      name: "find_top_rated_restaurants",
      description: "Find top-rated restaurants of a specific cuisine in a city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          cuisine: { type: "string" },
          count: { type: "number", default: 3 }
        },
        required: ["city", "cuisine"],
        additionalProperties: false
      }
    }
  },

  {
    type: "function",
    function: {
      name: "find_top_rated_meeting_venues",
      description: "Find top-rated meeting venues in a city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          type: { type: "string" },
          count: { type: "number", default: 3 }
        },
        required: ["city", "type"],
        additionalProperties: false
      }
    }
  },

  {
    type: "function",
    function: {
      name: "find_top_rated_attractions",
      description: "Find top-rated tourist attractions in a city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          count: { type: "number", default: 5 }
        },
        required: ["city"],
        additionalProperties: false
      }
    }
  },
   {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get weather information for a specific city",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "The name of the city to get weather information for",
          },
        },
        required: ["city"],
        additionalProperties: false,
      },
    },
  },
];

// System prompt loader
export function getSystemPrompt(): string {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), 'sys-new.txt'), 'utf-8');
    return content.trim();
  } catch (error) {
    console.error("Error reading system prompt file:", error);
    return "You are a helpful travel assistant.";
  }
}
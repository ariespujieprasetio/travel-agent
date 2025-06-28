import { ChatCompletionMessageParam, ChatCompletionMessageToolCall, ChatCompletionToolMessageParam } from "openai/resources";
import { openai, tools, getSystemPrompt } from "../config/openai";
import prisma from "../models/prisma";
import * as placesService from "./googlePlacesService";
import { Prisma } from "@prisma/client";
import { generateSessionTitle } from "./titleGeneratorService";
import { TravelMode } from "@googlemaps/google-maps-services-js";
import * as travelService from "../config/travelpayouts";
import { Hotel } from "../config/travelpayouts";
import * as weatherService from "../config/weather";

/**
 * Save a message to the database
 */
export async function saveMessage(
  sessionId: string,
  message: ChatCompletionMessageParam
): Promise<void> {
  const { role } = message;

  if (role === "tool") {
    const toolMessage = message as ChatCompletionToolMessageParam;
    await prisma.message.create({
      data: {
        sessionId,
        role,
        // Ensure content is always a string
        content: typeof toolMessage.content === 'string'
          ? toolMessage.content
          : JSON.stringify(toolMessage.content),
        toolCallId: toolMessage.tool_call_id,
      },
    });
  } else {
    const toolCalls = "tool_calls" in message ? message.tool_calls : undefined;
    await prisma.message.create({
      data: {
        sessionId,
        role,
        // Ensure content is always a string
        content: typeof message.content === 'string'
          ? message.content
          : message.content ? JSON.stringify(message.content) : "",
        // Use Prisma.JsonNull when no tool calls
        toolCalls: toolCalls
          ? JSON.stringify(toolCalls)
          : Prisma.JsonNull,
      },
    });
  }
}

export async function updateTitle(id: string, title: string, tagline: string) {
  const session = await prisma.chatSession.update({
    where: {
      id,

    },
    data: {
      title,
      tagline
    },
  });

  return session;
}

/**
 * Create a new chat session
 */
export async function createChatSession(userId: string) {
  const session = await prisma.chatSession.create({
    data: {
      userId,
    },
  });

  return session;
}

/**
 * Get a specific chat session with its messages
 */
export async function getChatSession(sessionId: string) {
  try {
    console.log('Fetching session with ID:', sessionId);

    if (!sessionId) {
      console.error('Session ID is undefined or null');
      return null;
    }

    const session = await prisma.chatSession.findUnique({
      where: {
        id: sessionId
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (session) {
      console.log(`Session found: ${session.id}`);
    } else {
      console.log(`No session found with ID: ${sessionId}`);
    }

    return session;
  } catch (error) {
    console.error(`Error fetching chat session: ${error}`);
    return null;
  }
}

/**
 * Get all chat sessions for a user
 */
/**
 * Get chat sessions for a user with filtering options
 * 
 * @param userId The user ID
 * @param options Filter options
 */
export async function getChatSessions(
  userId: string,
  options: {
    includeTempSessions?: boolean;
    saveFilter?: boolean;  // Optional filter: true for saved only, false for temporary only, undefined for both
    limit?: number;
    offset?: number;
  } = {}
) {
  const {
    includeTempSessions = false,
    saveFilter,
    limit,
    offset
  } = options;

  // Build where clause
  const whereClause: any = { userId };

  // Handle save filtering
  if (saveFilter !== undefined) {
    // If saveFilter is explicitly set, use it
    whereClause.save = saveFilter;
  } else if (!includeTempSessions) {
    // If includeTempSessions is false and saveFilter is undefined, 
    // use the legacy behavior of showing only saved sessions
    whereClause.save = true;
  }

  // Build the full query
  const query: any = {
    where: whereClause,
    orderBy: { createdAt: "desc" }
  };



  // Execute query
  const sessions = await prisma.chatSession.findMany(query);


  return sessions
}

/**
 * Get all messages for a chat session in a format suitable for OpenAI API
 */
export async function getMessagesForChat(sessionId: string): Promise<ChatCompletionMessageParam[]> {
  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((message): ChatCompletionMessageParam => {
    if (message.role === "tool") {
      return {
        role: message.role,
        content: message.content,
        tool_call_id: message.toolCallId,
      } as ChatCompletionToolMessageParam;
    } else if (message.toolCalls && message.toolCalls !== null) {
      const toolCallsData = typeof message.toolCalls === 'string'
        ? JSON.parse(message.toolCalls as string)
        : message.toolCalls;

      return {
        role: message.role,
        content: message.content,
        tool_calls: toolCallsData,
      } as ChatCompletionMessageParam;
    } else {
      return {
        role: message.role as any, // Cast to support any role type
        content: message.content,
      };
    }
  });
}

/**
 * Process a user message and generate a response using OpenAI
 */

function formatHotelsList(hotels: Hotel[], city: string, checkIn = "your selected dates", checkOut = "your selected dates") {
  let message = `Here are some 4-star hotels available in ${city} for your stay from ${checkIn} to ${checkOut}:\n\n`;

  for (const h of hotels) {
    message += `**${h.name}**\n`;

    message += `📍 Address: ${h.address}\n`;
    message += `⭐ Rating: ${h.rating || "Not rated"}\n`;

    if (h.price_from && h.price_to) {
      message += `💰 Price range: $${h.price_from.toFixed(2)} - $${h.price_to.toFixed(2)} per night\n`;
    } else if (h.price_from) {
      message += `💰 Price from: $${h.price_from.toFixed(2)} per night\n`;
    }

    message += `📞 Phone: ${h.phone || "Not available"}\n`;

    if (h.deeplink)
      message += `🔗 [Website](${h.deeplink})\n`;

    if (h.coords && h.coords.lat !== 0 && h.coords.lon !== 0)
      message += `[📍 Google Maps](https://www.google.com/maps/search/?api=1&query=${h.coords.lat},${h.coords.lon})\n`;

    message += `\n`;
  }

  return message;
}



export async function processMessage(
  sessionId: string,
  message: string,
  emit: (topic: string, data: string) => void
): Promise<boolean> {
  try {
    // Get existing messages or create a new chat
    let history = await getMessagesForChat(sessionId);
    let toolResult: any = null;


    // If there are no messages, add the system prompt
    if (history.length === 0) {
      const systemMessage: ChatCompletionMessageParam = {
        role: "system",
        content: getSystemPrompt(),
      };
      await saveMessage(sessionId, systemMessage);
      history = [systemMessage];
    }

    // Add the user message
    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: message,
    };
    await saveMessage(sessionId, userMessage);
    history.push(userMessage);

    // Process the conversation
    while (true) {
      // Create a chat completion
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: history,
        tools: tools,
        store: true,
        stream: true,
      });

      let acc = "";
      let toolId = "";
      let functionName = "";
      let args = "";
      let callFunction = false;
      let toolsCallsDetail: ChatCompletionMessageToolCall[] = [];
      let toolsCalls: ChatCompletionToolMessageParam[] = [];

      let toolCallStarted = false; // Flag baru

for await (const chunk of completion) {
  const delta = chunk.choices[0]?.delta;

  // Deteksi awal tool_call
  if (delta.tool_calls) {
    toolCallStarted = true;
  }

  // Emit hanya kalau belum masuk tool_call
  if (!toolCallStarted && delta.content) {
    emit(`msg-${sessionId}`, delta.content);
    acc += delta.content;
  }

  // Handle tool calls
  if (delta.tool_calls) {
    for (const call of delta.tool_calls) {
      if (call.function) {
        if (call.function.name) functionName = call.function.name;
        if (call.id) toolId = call.id;
        if (call.function.arguments) {
          args += call.function.arguments;

          const checkValidJSON = (s: string) => {
            try {
              JSON.parse(s);
              return true;
            } catch {
              return false;
            }
          };

          if (checkValidJSON(args)) {
            callFunction = true;

            console.log(args);

            const data = JSON.parse(args);
            args = "";

            console.log("⚙️  Received tool_call:", functionName, toolId);

            toolsCallsDetail.push({
              function: { name: functionName, arguments: JSON.stringify(data) },
              id: toolId,
              type: "function",
            });

                  // Call the appropriate function based on the function name
                  switch (functionName) {
                    case "calculate_distance":
                      // Convert travelMode string to TravelMode enum if provided

                      if (data.returnTotalOnly) {
                        // Return only total distance and duration
                        toolsCalls.push({
                          role: "tool",
                          content: JSON.stringify(await placesService.calculateTotalRouteDistance(data.route)),
                          tool_call_id: toolId,
                        });
                      } else {
                        // Return detailed information for each segment
                        toolsCalls.push({
                          role: "tool",
                          content: JSON.stringify(await placesService.calculateDistance(data.route)),
                          tool_call_id: toolId,
                        });
                      }
                      break; 


                    case "find_travel_destinations":
                      const places = await placesService.findTravelDestinations(data.city, data.count);
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(places),
                        tool_call_id: toolId,
                      });
                      break;
                    case "find_car_rentals":
                      const rentals = await placesService.findCarRentalServices(data.city, data.count);
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(rentals),
                        tool_call_id: toolId,
                      });
                      break;
                      case "search_flights":
                      const flights = await travelService.search_flights(
                        data.origin,
                        data.destination,
                        data.departDate,
                        data.returnDate // opsional
                      );
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(flights),
                        tool_call_id: toolId,
                      });
                      break;
                    case "find_hotels":
                      try {
                        const hotels = await travelService.find_hotels_new(
                          data.city,
                          data.stars,
                          data.checkIn,
                          data.checkOut,
                          data.adults || 2,
                          data.limit || 5
                        );

                        if (hotels.length === 0) {
                          toolsCalls.push({
                            role: "tool",
                            content: JSON.stringify({ error: "No hotels found for the given parameters." }),
                            tool_call_id: toolId,
                          });
                        } else {
                          const hotelMessage = formatHotelsList(hotels, data.city, data.checkIn, data.checkOut);
                          toolsCalls.push({
                            role: "tool",
                            content: hotelMessage,
                            tool_call_id: toolId,
                          });
                        }
                      } catch (e) {
                        const err = e as Error;
                        console.error("find_hotels failed:", err.message);
                        toolsCalls.push({
                          role: "tool",
                          content: JSON.stringify({ error: "Hotel search failed. Please try another destination or date." }),
                          tool_call_id: toolId,
                        });
                      }
                      break;

                      case "find_top_rated_hotels":
                        try {
                          const hotels = await travelService.find_top_rated_hotels_new(
                            data.city,
                            data.stars,
                            data.count || 3
                          );

                          const hotelMessage = formatHotelsList(
                            hotels,
                            data.city,
                            data.checkIn,
                            data.checkOut
                          );

                          toolsCalls.push({
                            role: "tool",
                            content: hotelMessage,
                            tool_call_id: toolId,
                          });
                        } catch (err) {
                          const error = err as Error;
                          console.error("find_top_rated_hotels error:", error.message);
                          toolsCalls.push({
                            role: "tool",
                            content: JSON.stringify({ error: "Unable to fetch top-rated hotels." }),
                            tool_call_id: toolId,
                          });
                        }
                        break;

                    case "find_restaurants":
                      const restaurants = await placesService.findRestaurants(
                        data.city,
                        data.cuisine,
                        data.count || 3
                      );
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(restaurants),
                        tool_call_id: toolId,
                      });
                      break;
                    case "find_nightlife":
                      const nightlife = await placesService.findNightlife(
                        data.city,
                        data.type,
                        data.count || 3
                      );
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(nightlife),
                        tool_call_id: toolId,
                      });
                      break;
                    case "find_meeting_venues":
                      const meetingVenues = await placesService.findMeetingVenues(
                        data.city,
                        data.type,
                        data.count || 3
                      );
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(meetingVenues),
                        tool_call_id: toolId,
                      });
                      break;
                      case "find_top_rated_hotels":
                      const topHotels = await travelService.find_top_rated_hotels_new(
                        data.city,
                        data.stars,
                        data.count || 3
                      );

                      const topHotelMessage = formatHotelsList(
                        topHotels,
                        data.city,
                        data.checkIn,
                        data.checkOut
                      );

                      toolsCalls.push({
                        role: "tool",
                        content: topHotelMessage,
                        tool_call_id: toolId,
                      });
                      break;
                    case "find_top_rated_restaurants":
                      const topRestaurants = await placesService.findTopRatedRestaurants(
                        data.city,
                        data.cuisine,
                        data.count || 3
                      );
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(topRestaurants),
                        tool_call_id: toolId,
                      });
                      break;
                    case "find_top_rated_meeting_venues":
                      const topMeetingVenues = await placesService.findTopRatedMeetingVenues(
                        data.city,
                        data.type,
                        data.count || 3
                      );
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(topMeetingVenues),
                        tool_call_id: toolId,
                      });
                      break;
                    case "find_top_rated_attractions":
                      const topAttractions = await placesService.findTopRatedAttractions(
                        data.city,
                        data.count || 5
                      );
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(topAttractions),
                        tool_call_id: toolId,
                      });
                      break;
                      case "get_weather":
                        const weather = await weatherService.getWeather(data.city);
                        toolsCalls.push({
                          role: "tool",
                          content: JSON.stringify(weather),
                          tool_call_id: toolId,
                        });
                      break;
                      default:
                        console.warn("⚠️ Unknown tool_call function:", functionName);
                        toolsCalls.push({
                          role: "tool",
                          content: JSON.stringify({ error: `Function ${functionName} not implemented.` }),
                          tool_call_id: toolId,
                        });
                        break;
                  }
                }
              }
            }
          }
        }
      }

      for (const call of toolsCallsDetail) {
        const matched = toolsCalls.find(t => t.tool_call_id === call.id);
        if (!matched) {
          console.warn("❗ Auto-responding UNHANDLED tool_call_id:", call.id);
          toolsCalls.push({
            role: "tool",
            content: JSON.stringify({ error: "No handler provided." }),
            tool_call_id: call.id,
          });
        }
      }

      if (callFunction) {
        const assistantMessage: ChatCompletionMessageParam = {
          role: "assistant",
          content: acc,
          tool_calls: toolsCallsDetail,
        };
        await saveMessage(sessionId, assistantMessage);
        history.push(assistantMessage);

        for (const toolCall of toolsCalls) {
          await saveMessage(sessionId, toolCall);
          history.push(toolCall);
        }

        continue;
      } else {
        const assistantMessage: ChatCompletionMessageParam = {
          role: "assistant",
          content: acc,
        };
        await saveMessage(sessionId, assistantMessage);
        history.push(assistantMessage);
        emit(`msg-${sessionId}`, "\n\0");
        break;
      }
    }

    return true;
  } catch (error) {
    console.error("❌ processMessage error:", error);
    return false;
  }
}

/**
 * Initialize a chat session with a greeting
 */
export async function initializeChat(
  sessionId: string,
  emit: (topic: string, data: string) => void
): Promise<boolean> {
  try {
    // Get existing messages or create a new chat
    let history = await getMessagesForChat(sessionId);

    // If there are no messages, add the system prompt
    if (history.length === 0) {
      const systemMessage: ChatCompletionMessageParam = {
        role: "system",
        content: getSystemPrompt(),
      };
      await saveMessage(sessionId, systemMessage);
      history = [systemMessage];
    }

    // Create an initial greeting from the assistant
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: history,
      tools: tools,
      store: true,
      stream: true,
    });

    let acc = "";

    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta;
      acc += delta.content || "";

      if (!delta.tool_calls && delta.content) {
        emit(`msg-${sessionId}`, delta.content);
      }
    }

    // Save the assistant's response
    const assistantMessage: ChatCompletionMessageParam = {
      role: "assistant",
      content: acc,
    };
    await saveMessage(sessionId, assistantMessage);
    emit(`msg-${sessionId}`, "\n\0");

    return true;
  } catch (error) {
    console.error("Error during OpenAI API call:", error);
    return false;
  }
}

/**
 * Convert a temporary session to a permanent one
 * This function will only change sessions with save=false to save=true
 * @param sessionId The ID of the session to save
 * @returns The updated session, or null if the session was not found or already saved
 */
export async function saveTemporarySession(sessionId: string) {
  // First check if the session exists and is temporary (save=false)
  const session = await prisma.chatSession.findFirst({
    where: {
      id: sessionId,
      save: false
    }
  });

  // If session doesn't exist or is already saved, return null
  if (!session) {
    return null;
  }

  // Update the session to be saved
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { save: true }
  });
}
/**
 * Toggle the save flag for a chat session (true → false or false → true)
 * @param sessionId The ID of the session to toggle
 * @returns The updated session with the toggled save flag
 */
export async function toggleSessionSaveFlag(sessionId: string) {
  // First get the current session to determine its current save status
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { id: true, save: true }
  });

  if (!session) {
    throw new Error("Chat session not found");
  }

  // Toggle the save flag (true → false or false → true)
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { save: !session.save }
  });
}
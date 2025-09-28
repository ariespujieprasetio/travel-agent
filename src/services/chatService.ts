import {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionToolMessageParam,
} from "openai/resources";
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
        content:
          typeof toolMessage.content === "string"
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
        content:
          typeof message.content === "string"
            ? message.content
            : message.content
            ? JSON.stringify(message.content)
            : "",
        toolCalls: toolCalls ? JSON.stringify(toolCalls) : Prisma.JsonNull,
      },
    });
  }
}

export async function updateTitle(id: string, title: string, tagline: string) {
  return prisma.chatSession.update({
    where: { id },
    data: { title, tagline },
  });
}

export async function createChatSession(userId: string) {
  return prisma.chatSession.create({ data: { userId } });
}

export async function getChatSession(sessionId: string) {
  try {
    console.log("Fetching session with ID:", sessionId);
    if (!sessionId) return null;

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (session) console.log(`Session found: ${session.id}`);
    else console.log(`No session found with ID: ${sessionId}`);

    return session;
  } catch (error) {
    console.error(`Error fetching chat session: ${error}`);
    return null;
  }
}

export async function getChatSessions(
  userId: string,
  options: {
    includeTempSessions?: boolean;
    saveFilter?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { includeTempSessions = false, saveFilter } = options;
  const whereClause: any = { userId };

  if (saveFilter !== undefined) {
    whereClause.save = saveFilter;
  } else if (!includeTempSessions) {
    whereClause.save = true;
  }

  return prisma.chatSession.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });
}

export async function getMessagesForChat(
  sessionId: string
): Promise<ChatCompletionMessageParam[]> {
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
      const toolCallsData =
        typeof message.toolCalls === "string"
          ? JSON.parse(message.toolCalls as string)
          : message.toolCalls;

      return {
        role: message.role,
        content: message.content,
        tool_calls: toolCallsData,
      } as ChatCompletionMessageParam;
    } else {
      return {
        role: message.role as any,
        content: message.content,
      };
    }
  });
}

function formatHotelsList(
  hotels: Hotel[],
  city: string,
  checkIn = "your selected dates",
  checkOut = "your selected dates"
) {
  let message = `Here are some hotels available in ${city} for your stay from ${checkIn} to ${checkOut}:\n\n`;

  for (const h of hotels) {
    message += `**${h.name}**\n`;
    message += `📍 Address: ${h.address}\n`;
    message += `⭐ Rating: ${h.rating || "Not rated"}\n`;

    if (h.price_from && h.price_to) {
      message += `💰 Price range: $${h.price_from.toFixed(
        2
      )} - $${h.price_to.toFixed(2)} per night\n`;
    } else if (h.price_from) {
      message += `💰 Price from: $${h.price_from.toFixed(2)} per night\n`;
    }

    message += `📞 Phone: ${h.phone || "Not available"}\n`;

    if (h.deeplink) message += `🔗 [Website](${h.deeplink})\n`;

    if (h.coords && h.coords.lat !== 0 && h.coords.lon !== 0) {
      message += `[📍 Google Maps](https://www.google.com/maps/search/?api=1&query=${h.coords.lat},${h.coords.lon})\n`;
    }
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
    let history = await getMessagesForChat(sessionId);
    if (history.length === 0) {
      const systemMessage: ChatCompletionMessageParam = {
        role: "system",
        content: getSystemPrompt(),
      };
      await saveMessage(sessionId, systemMessage);
      history = [systemMessage];
    }

    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: message,
    };
    await saveMessage(sessionId, userMessage);
    history.push(userMessage);

    while (true) {
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
      let toolCallStarted = false;

      for await (const chunk of completion) {
        const delta = chunk.choices[0]?.delta;

        if (delta.tool_calls) toolCallStarted = true;
        if (!toolCallStarted && delta.content) {
          emit(`msg-${sessionId}`, delta.content);
          acc += delta.content;
        }

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
                  const data = JSON.parse(args);
                  args = "";

                  console.log("⚙️  Received tool_call:", functionName, toolId);

                  toolsCallsDetail.push({
                    function: {
                      name: functionName,
                      arguments: JSON.stringify(data),
                    },
                    id: toolId,
                    type: "function",
                  });

                  switch (functionName) {
                    case "calculate_distance":
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(
                          data.returnTotalOnly
                            ? await placesService.calculateTotalRouteDistance(
                                data.route
                              )
                            : await placesService.calculateDistance(data.route)
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "find_travel_destinations":
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(
                          await placesService.findTravelDestinations(
                            data.city,
                            data.count
                          )
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "find_car_rentals":
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(
                          await travelService.find_car_rentals(
                            data.city,
                            data.count
                          )
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "search_flights":
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(
                          await travelService.search_flights(
                            data.origin,
                            data.destination,
                            data.departDate,
                            data.returnDate
                          )
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "find_hotels":
                      const hotels = await travelService.find_hotels(
                        data.city,
                        data.stars,
                        data.checkIn,
                        data.checkOut,
                        data.adults || 2,
                        data.limit || 5
                      );
                      toolsCalls.push({
                        role: "tool",
                        content:
                          hotels.length === 0
                            ? JSON.stringify({
                                error:
                                  "No hotels found for the given parameters.",
                              })
                            : formatHotelsList(
                                hotels,
                                data.city,
                                data.checkIn,
                                data.checkOut
                              ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "find_top_rated_hotels":
                      const topHotels =
                        await travelService.find_top_rated_hotels(
                          data.city,
                          data.stars,
                          data.count || 3
                        );
                      toolsCalls.push({
                        role: "tool",
                        content: formatHotelsList(
                          topHotels,
                          data.city,
                          data.checkIn,
                          data.checkOut
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "find_restaurants":
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(
                          await placesService.findRestaurants(
                            data.city,
                            data.cuisine,
                            data.count || 3
                          )
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "find_nightlife":
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(
                          await placesService.findNightlife(
                            data.city,
                            data.type,
                            data.count || 3
                          )
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "find_meeting_venues":
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(
                          await placesService.findMeetingVenues(
                            data.city,
                            data.type,
                            data.count || 3
                          )
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "find_top_rated_restaurants":
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(
                          await placesService.findTopRatedRestaurants(
                            data.city,
                            data.cuisine,
                            data.count || 3
                          )
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "find_top_rated_meeting_venues":
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(
                          await placesService.findTopRatedMeetingVenues(
                            data.city,
                            data.type,
                            data.count || 3
                          )
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "find_top_rated_attractions":
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(
                          await placesService.findTopRatedAttractions(
                            data.city,
                            data.count || 5
                          )
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "get_weather":
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(
                          await weatherService.getWeather(data.city)
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    default:
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify({
                          error: `Function ${functionName} not implemented.`,
                        }),
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

export async function initializeChat(
  sessionId: string,
  emit: (topic: string, data: string) => void
): Promise<boolean> {
  try {
    let history = await getMessagesForChat(sessionId);
    if (history.length === 0) {
      const systemMessage: ChatCompletionMessageParam = {
        role: "system",
        content: getSystemPrompt(),
      };
      await saveMessage(sessionId, systemMessage);
      history = [systemMessage];
    }

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

export async function saveTemporarySession(sessionId: string) {
  const session = await prisma.chatSession.findFirst({
    where: { id: sessionId, save: false },
  });
  if (!session) return null;

  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { save: true },
  });
}

export async function toggleSessionSaveFlag(sessionId: string) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { id: true, save: true },
  });
  if (!session) throw new Error("Chat session not found");

  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { save: !session.save },
  });
}

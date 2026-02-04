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
import * as weatherService from "../config/weather";
import { fetchHolidays } from "./holidayService";
import { getHolidaysInRange, formatHolidaySummary } from "../utils/holidayUtils";
import { resolveCountryCode } from "./locationService";
import {
  fetchDisasterAlertsByCountry,
  buildDisasterNewsSummary,
} from "./disasterService";
import { convertIso2ToIso3 } from "./locationService";


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

function parseDates(text: string): { start: string; end: string } | null {
  const isoMatches = text.match(/\d{4}-\d{2}-\d{2}/g);
  if (isoMatches) {
    return {
      start: isoMatches[0],
      end: isoMatches[1] || isoMatches[0],
    };
  }

  const rangeMatch = text.match(/(\d{1,2})\s*-\s*(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/i);
  if (rangeMatch) {
    const [, d1, d2, monthName, year] = rangeMatch;

    const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
    const pad = (n: string | number) => String(n).padStart(2, "0");

    return {
      start: `${year}-${pad(monthIndex)}-${pad(d1)}`,
      end: `${year}-${pad(monthIndex)}-${pad(d2)}`,
    };
  }

  return null;
}

async function buildHolidayContext(message: string) {
  console.log("Holiday context raw message:", message);

  const parsedDates = parseDates(message);
  console.log("Parsed dates:", parsedDates);

  if (!parsedDates) {
    console.log("No valid dates detected");
    return null;
  }

  const { start: startDate, end: endDate } = parsedDates;
  console.log("Using date range:", startDate, "→", endDate);

  const cityMatch =
    message.match(/to\s+([A-Za-z\s]+)/i) ||
    message.match(/in\s+([A-Za-z\s]+)/i) ||
    message.match(/visit\s+([A-Za-z\s]+)/i);

  console.log("City match result:", cityMatch);

  if (!cityMatch) {
    console.log("No city detected in message");
    return null;
  }

  const city = cityMatch[1].trim();
  console.log("Detected city:", city);

  const countryCode = await resolveCountryCode(city);
  console.log("Country code from geocoding:", countryCode);

  if (!countryCode) {
    console.log("Could not determine country code");
    return null;
  }

  const year = new Date(startDate).getFullYear();
  console.log("Fetching holidays for year:", year);

  const holidays = await fetchHolidays(countryCode, year);
  console.log("Total holidays from API:", holidays.length);

  const filtered = getHolidaysInRange(holidays, startDate, endDate);
  console.log("Holidays within trip range:", filtered.length);

  const summary = formatHolidaySummary(filtered);
  console.log("Final holiday summary:", summary);

  return summary;
}

async function buildNewsContext(message: string) {
  const parsedDates = parseDates(message);
  if (!parsedDates) return null;

  const cityMatch =
    message.match(/to\s+([A-Za-z\s]+)/i) ||
    message.match(/in\s+([A-Za-z\s]+)/i) ||
    message.match(/visit\s+([A-Za-z\s]+)/i);

  if (!cityMatch) return null;

  const city = cityMatch[1].trim();
  const iso2 = await resolveCountryCode(city);
  if (!iso2) return null;

  const iso3 = convertIso2ToIso3(iso2);
  if (!iso3) return null;

  console.log("Fetching disaster alerts for:", iso3);

  const alerts = await fetchDisasterAlertsByCountry(iso3);
  return buildDisasterNewsSummary(alerts);
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

    const fullConversationText = history
    .filter(m => m.role === "user" && typeof m.content === "string")
    .map(m => m.content)
    .join(" ");

    console.log("Full conversation for holiday detection:", fullConversationText);

    const holidaySummary =
    (await buildHolidayContext(fullConversationText)) ||
    "No major national public holidays are typically observed during these dates.";

    const newsSummary =
    (await buildNewsContext(fullConversationText)) ||
    "No major travel disruptions or safety advisories are widely reported at this time.";


    history.unshift({
      role: "system",
      content: `
    ### VERIFIED TRAVEL CONTEXT (INTERNAL DATA)
    
    The following information is verified and MUST be reflected in the travel context sections.
    
    NATIONAL HOLIDAYS:
    ${holidaySummary}
    
    TRAVEL SAFETY & DISASTER ALERTS:
    ${newsSummary}
    `.trim(),
    });    

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

        if (delta.tool_calls && !toolCallStarted) {
          toolCallStarted = true;
          emit(`msg-${sessionId}`, "__LOADING__");
        }
        
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

                  console.log("Received tool_call:", functionName, toolId);

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
                      case "find_hotels": {
                        const hotels = await placesService.findHotels(
                          data.city,
                          data.stars || 4,
                          data.nearCBD ?? false
                        );
                      
                        if (!hotels.length) {
                          toolsCalls.push({
                            role: "tool",
                            content: "No hotels found.",
                            tool_call_id: toolId,
                          });
                          break;
                        }
                      
                        const hotelMessage = hotels.map(h => {
                          const bookingSearchQuery = `${h.displayName.text}, ${data.city}`;
                      
                          const deeplink = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
                            bookingSearchQuery
                          )}&checkin=${data.checkIn}&checkout=${data.checkOut}&group_adults=${data.adults || 2}&nflt=class=${data.stars || 4}`;
                      
                          return `
                      **${h.displayName.text}**
                      ⭐ Rating: ${h.rating ?? "-"}
                      📍 ${h.formattedAddress}
                      🗺️ ${h.googleMapsUri}
                      🔗 Book on Booking.com:
                      ${deeplink}
                      `;
                        }).join("\n");
                      
                        toolsCalls.push({
                          role: "tool",
                          content: hotelMessage,
                          tool_call_id: toolId,
                        });
                        break;
                      }
                                        

                      case "find_top_rated_hotels": {
                        const hotels = await placesService.findTopRatedHotels(
                          data.city,
                          data.stars || 4,
                          data.count || 3
                        );
                      
                        if (!hotels.length) {
                          toolsCalls.push({
                            role: "tool",
                            content: "No top-rated hotels found.",
                            tool_call_id: toolId,
                          });
                          break;
                        }
                      
                        const msg = hotels.map(h => {
                          const bookingQuery = `${h.displayName.text}, ${data.city}`;
                      
                          const deeplink = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
                            bookingQuery
                          )}&checkin=${data.checkIn}&checkout=${data.checkOut}&group_adults=${data.adults || 2}&nflt=class=${data.stars || 4}`;
                      
                          return `
                      **${h.displayName.text}**
                      ⭐ Rating: ${h.rating ?? "-"}
                      📍 ${h.formattedAddress}
                      🔗 Book on Booking.com:
                      ${deeplink}
                      `;
                        }).join("\n");
                      
                        toolsCalls.push({
                          role: "tool",
                          content: msg,
                          tool_call_id: toolId,
                        });
                        break;
                      }
                                                                    

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

                    case "find_local_events":
                      toolsCalls.push({
                        role: "tool",
                        content: JSON.stringify(
                          await placesService.findLocalEvents(
                            data.city,
                            data.count || 5
                          )
                        ),
                        tool_call_id: toolId,
                      });
                      break;

                    case "find_top_rated_hotels":
                    const topHotels = await travelService.find_top_rated_hotels(
                      data.city,
                      data.stars,
                      data.count || 3
                    );

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
                        const step9Reached = history.some(
                          (m) =>
                            m.role === "assistant" &&
                            typeof m.content === "string" &&
                            m.content.includes("Step 9")
                        );
                      
                        if (!step9Reached) {
                          console.log("Blocked attractions tool call before Step 9");
                          toolsCalls.push({
                            role: "tool",
                            content: JSON.stringify({
                              error: "Tourist attractions are not available until Step 9 of the flow."
                            }),
                            tool_call_id: toolId,
                          });
                          break;
                        }
                      
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

                        case "get_weather": {
                          const weatherPayload = await weatherService.getWeather(data.city);
                        
                          console.log("Weather payload sent to AI:", {
                            city: weatherPayload.location.city,
                            hasForecast: !!weatherPayload.forecast_summary?.length,
                            hasAlerts: !!weatherPayload.alerts?.length,
                            hasInsights: !!weatherPayload.insights,
                          });
                        
                          toolsCalls.push({
                            role: "tool",
                            content: JSON.stringify({
                              type: "weather_report",
                              ...weatherPayload,
                            }),
                            tool_call_id: toolId,
                          });
                        
                          break;
                        }

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

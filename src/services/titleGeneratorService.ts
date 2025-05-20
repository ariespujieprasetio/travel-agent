// src/services/titleGeneratorService.ts

import { openai } from "../config/openai";
import prisma from "../models/prisma";

/**
 * Interface for the session title data
 */
interface SessionTitleData {
  title: string;
  tagline: string;
}

/**
 * Generates a title for a chat session based on its messages
 * Uses OpenAI to generate an appropriate title, and the last user message as tagline
 */
export async function generateSessionTitle(conversationSummary: string): Promise<SessionTitleData> {
  try {
    // // Get all messages for the session
    // const messages = await prisma.message.findMany({
    //   where: { sessionId },
    //   orderBy: { createdAt: 'asc' },
    //   take: 10 // Limit to first 10 messages to avoid excessive token usage
    // });
    
    // if (messages.length === 0) {
    //   return {
    //     title: "New Conversation",
    //     tagline: "Start planning your trip"
    //   };
    // }
    
    // // Use the most recent user message as the tagline
    // const userMessages = messages.filter(m => m.role === 'user');
    // let tagline = "Start planning your trip";
    
    // if (userMessages.length > 0) {
    //   const lastUserMessage = userMessages[userMessages.length - 1].content;
    //   // Truncate if too long
    //   tagline = lastUserMessage.length > 60 
    //     ? lastUserMessage.substring(0, 57) + '...' 
    //     : lastUserMessage;
    // }
    
    // Prepare messages for OpenAI
    // const conversationSummary = messages.map(m => {
      // return `${m.role}: ${m.content}`;
    // }).join('\n');
    
    // Generate title using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates concise, descriptive titles for travel planning conversations. The title should be 2-5 words, focus on destinations or travel themes mentioned, and be capitalized appropriately."
        },
        {
          role: "user",
          content: `Please generate a short, concise title (2-5 words) for this travel conversation. Focus on the destination or main travel theme:\n\n${conversationSummary}`
        }
      ],
      max_tokens: 20,
      temperature: 0.7
    });
    
    let title = completion.choices[0]?.message.content?.trim() || "Travel Plans";
    
    // Clean up the title if needed (remove quotes if present)
    title = title.replace(/^["'](.*)["']$/, '$1');
    
    
    return {
      title,
      tagline: "Explore your next destination"
    };
  } catch (error) {
    console.error("Error generating session title:", error);
    return {
      title: "Travel Planning",
      tagline: "Explore your next destination"
    };
  }
}

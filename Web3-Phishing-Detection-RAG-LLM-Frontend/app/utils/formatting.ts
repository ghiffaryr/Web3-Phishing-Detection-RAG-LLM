import { ChatSession } from "../types/chat";

/**
 * Formats a chat title from the first message of a chat session
 */
export const getChatTitle = (session: ChatSession): string => {
  if (session.messages.length === 0) return "New conversation";
  // Trim any whitespace from the content before processing
  const content = session.messages[0]?.content?.trim() || "";
  return content.substring(0, 30) + (content.length > 30 ? "..." : "");
};

/**
 * Formats a date in a readable format
 */
export const formatSessionDate = (date: Date): string => {
  try {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    return new Intl.DateTimeFormat("en-US", options).format(date);
  } catch (e) {
    console.error("Error formatting date:", e);
    return date.toLocaleString();
  }
};

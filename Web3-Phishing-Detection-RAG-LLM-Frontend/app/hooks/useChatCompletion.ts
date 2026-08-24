import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ChatMessage } from "../types/chat";

export const useChatCompletion = () => {
  const [inputs, setInputs] = useState({
    model_name: "",
    prompt: "",
  });
  const [answer, setAnswer] = useState("");
  const [displayedAnswer, setDisplayedAnswer] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentTypingMessageId, setCurrentTypingMessageId] = useState<
    string | null
  >(null);

  // Add a ref to track the current chat history
  const chatHistoryRef = useRef<ChatMessage[]>([]);
  // Add a ref to track the update function
  const updateChatHistoryRef = useRef<(history: ChatMessage[]) => void>(
    () => {}
  );

  // Enhanced sanitization function to handle repeated instruction patterns
  const sanitizeResponse = (text: string): string => {
    if (!text) return "";

    // Target the specific instruction patterns that are appearing
    const instructionPatterns = [
      "Use above context if useful.",
      "Please respond to the following task.",
      "Use above context if useful. Please respond to the following task.",
    ];

    // First pass: Remove all occurrences of exact instruction patterns
    let cleanedText = text;
    instructionPatterns.forEach((pattern) => {
      // Create a regex that will match all occurrences globally with optional whitespace
      const patternRegex = new RegExp(
        pattern.replace(/\./g, "\\.").replace(/\s+/g, "\\s+"),
        "gi"
      );
      cleanedText = cleanedText.replace(patternRegex, "");
    });

    // Second pass: Handle specific instruction patterns with flexible spacing and punctuation
    const flexiblePatterns = [
      /use\s+above\s+context\s+if\s+useful[.,]?\s*/gi,
      /please\s+respond\s+to\s+the\s+following\s+task[.,]?\s*/gi,
    ];

    flexiblePatterns.forEach((pattern) => {
      cleanedText = cleanedText.replace(pattern, "");
    });

    // Trim any extra whitespace that might be left after removing instructions
    return cleanedText.trim();
  };

  // Modified context creation to prevent instruction text from being included
  const createCleanContext = (history: ChatMessage[]): string => {
    if (history.length === 0) return "";

    return history
      .map((msg) => {
        // Clean the message content before using it in context
        let content = msg.content || "";

        // If it's an assistant message, sanitize it to prevent instruction repetition
        if (msg.role === "assistant") {
          content = sanitizeResponse(content);
        }

        const rolePrefix = msg.role === "user" ? "User" : "Assistant";
        return `${rolePrefix}: ${content}`;
      })
      .join("\n\n");
  };

  // Typing effect for assistant messages
  useEffect(() => {
    if (!answer) return;

    // Apply sanitization before starting the typing effect
    const cleanAnswer = sanitizeResponse(answer);

    setDisplayedAnswer("");
    setIsTyping(true);

    let currentIndex = 0;
    const typingSpeed = 15; // ms per character

    const typingInterval = setInterval(() => {
      if (currentIndex < cleanAnswer.length) {
        setDisplayedAnswer(cleanAnswer.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);

        // When typing is complete, ensure the assistant message has the cleaned content
        if (
          currentTypingMessageId &&
          chatHistoryRef.current.length > 0 &&
          updateChatHistoryRef.current
        ) {
          const updatedHistory = chatHistoryRef.current.map((msg) =>
            msg.id === currentTypingMessageId
              ? { ...msg, content: cleanAnswer }
              : msg
          );

          // Update the chat history in the component
          updateChatHistoryRef.current(updatedHistory);

          // Also update localStorage with the final message content
          try {
            const activeSessionId = localStorage.getItem("activeSessionId");
            if (activeSessionId) {
              const sessions = JSON.parse(
                localStorage.getItem("chatSessions") || "[]"
              );
              const updatedSessions = sessions.map((session: any) => {
                if (session.id === activeSessionId) {
                  return {
                    ...session,
                    messages: updatedHistory,
                    lastUpdated: new Date().toISOString(),
                  };
                }
                return session;
              });
              localStorage.setItem(
                "chatSessions",
                JSON.stringify(updatedSessions)
              );
            }
          } catch (storageErr) {
            console.error(
              "Failed to update final message in localStorage:",
              storageErr
            );
          }
        }

        setCurrentTypingMessageId(null);
      }
    }, typingSpeed);

    return () => clearInterval(typingInterval);
  }, [answer]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputs((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (
    chatHistory: ChatMessage[],
    updateChatHistory: (updatedHistory: ChatMessage[]) => void,
    overridePrompt?: string
  ) => {
    // Store the current chat history and update function in refs
    chatHistoryRef.current = chatHistory;
    updateChatHistoryRef.current = updateChatHistory;

    // Get the display prompt (what's shown in UI) vs API prompt (includes file context)
    const apiPrompt = overridePrompt || inputs.prompt;
    const displayPrompt = inputs.prompt; // Always show the original prompt to the user

    if (!displayPrompt.trim()) return;

    // Add user message to chat history with the DISPLAY prompt (not the enhanced one)
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: displayPrompt, // Only show the original user prompt in UI
      timestamp: new Date(),
    };

    const newChatHistory = [...chatHistory, userMessage];
    updateChatHistory(newChatHistory);

    // Create a placeholder for assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "", // This will be updated once typing is complete
      timestamp: new Date(),
    };

    updateChatHistory([...newChatHistory, assistantPlaceholder]);
    setCurrentTypingMessageId(assistantMessageId);
    setLoading(true);
    setError("");

    try {
      // Create CLEAN context from previous messages to avoid instruction repetition
      console.log("Chat history:", chatHistory);
      const context = createCleanContext(chatHistory);

      console.log("Building context:", context);
      console.log("Current prompt:", apiPrompt);

      // Send request with API prompt (which may include file context)
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_HOST}:${process.env.NEXT_PUBLIC_API_PORT}/${process.env.NEXT_PUBLIC_API_PREFIX}/model/generate`,
        {
          model_name: inputs.model_name,
          prompt: apiPrompt,
          context: context,
        }
      );

      // Apply sanitization immediately when receiving the API response
      const sanitizedCompletion = sanitizeResponse(data.result.completion);
      setAnswer(sanitizedCompletion);

      // Update the chat history reference with the new history including the placeholder
      chatHistoryRef.current = [
        ...newChatHistory,
        {
          ...assistantPlaceholder,
          content: sanitizedCompletion,
        },
      ];

      // Store the updated chat history in localStorage
      try {
        // Find the current activeSessionId from localStorage
        const activeSessionId = localStorage.getItem("activeSessionId");
        if (activeSessionId) {
          // Get existing sessions
          const sessions = JSON.parse(
            localStorage.getItem("chatSessions") || "[]"
          );
          // Find and update the active session
          const updatedSessions = sessions.map((session: any) => {
            if (session.id === activeSessionId) {
              return {
                ...session,
                messages: chatHistoryRef.current,
                lastUpdated: new Date().toISOString(),
              };
            }
            return session;
          });
          // Save back to localStorage
          localStorage.setItem("chatSessions", JSON.stringify(updatedSessions));
        }
      } catch (storageErr) {
        console.error("Failed to save chat to localStorage:", storageErr);
      }

      // Clear the prompt input after submission
      setInputs((prev) => ({
        ...prev,
        prompt: "",
      }));

      return {
        success: true,
        messageId: assistantMessageId,
        updatedHistory: [
          ...newChatHistory,
          {
            ...assistantPlaceholder,
            content: sanitizedCompletion,
          },
        ],
      };
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching the answer.");

      // Remove the placeholder on error
      updateChatHistory(newChatHistory);
      return {
        success: false,
        error: "API request failed",
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    inputs,
    setInputs,
    answer,
    displayedAnswer,
    isTyping,
    error,
    loading,
    currentTypingMessageId,
    handleChange,
    handleSubmit,
  };
};

export default useChatCompletion;

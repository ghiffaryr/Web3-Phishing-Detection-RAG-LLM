import { useState, useEffect } from "react";
import { ChatMessage, ChatSession } from "../types/chat";

const useChatSessions = (isInitialized: boolean) => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Load chat sessions from localStorage when initialized
  useEffect(() => {
    if (!isInitialized) return;

    try {
      // Load chat sessions
      const storedSessions = localStorage.getItem("chatSessions");
      const storedActiveId = localStorage.getItem("activeSessionId");

      if (storedSessions) {
        const sessions = JSON.parse(storedSessions);
        setChatSessions(sessions);

        // Set active session
        if (
          storedActiveId &&
          sessions.some((s: ChatSession) => s.id === storedActiveId)
        ) {
          setActiveSessionId(storedActiveId);
          // Find and set the chat history for this session
          const activeSession = sessions.find(
            (s: ChatSession) => s.id === storedActiveId
          );
          if (activeSession) {
            setChatHistory(activeSession.messages || []);
          }
        } else if (sessions.length > 0) {
          // If no active session or it doesn't exist, use the first session
          setActiveSessionId(sessions[0].id);
          setChatHistory(sessions[0].messages || []);
          localStorage.setItem("activeSessionId", sessions[0].id);
        }
      } else if (isInitialized) {
        // If no sessions exist, create a new one
        handleNewChat();
      }
    } catch (error) {
      console.error("Error loading chat sessions:", error);
      // If there's an error, create a new chat
      handleNewChat();
    }
  }, [isInitialized]);

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized || chatSessions.length === 0) return;

    try {
      localStorage.setItem("chatSessions", JSON.stringify(chatSessions));
      localStorage.setItem("activeSessionId", activeSessionId);
    } catch (error) {
      console.error("Error saving chat sessions:", error);
    }
  }, [chatSessions, activeSessionId, isInitialized]);

  // Update chat history in the sessions whenever it changes
  useEffect(() => {
    if (!isInitialized || !activeSessionId) return;

    setChatSessions((prevSessions) =>
      prevSessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: chatHistory,
              lastUpdated: new Date().toISOString(),
            }
          : session
      )
    );
  }, [chatHistory, activeSessionId, isInitialized]);

  // Create a new chat session
  const handleNewChat = () => {
    const newSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    setChatSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setChatHistory([]);
  };

  // Change active session
  const handleSessionChange = (sessionId: string) => {
    if (sessionId === activeSessionId) return;

    setActiveSessionId(sessionId);

    // Find the session and set its messages as current chat history
    const session = chatSessions.find((s) => s.id === sessionId);
    if (session) {
      setChatHistory(session.messages || []);
    }
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string) => {
    setChatSessions((prev) =>
      prev.filter((session) => session.id !== sessionId)
    );

    // If the active session is deleted, switch to the first available session or create a new one
    if (sessionId === activeSessionId) {
      const remainingSessions = chatSessions.filter(
        (session) => session.id !== sessionId
      );
      if (remainingSessions.length > 0) {
        setActiveSessionId(remainingSessions[0].id);
        setChatHistory(remainingSessions[0].messages || []);
      } else {
        handleNewChat();
      }
    }
  };

  return {
    chatSessions,
    activeSessionId,
    chatHistory,
    setChatHistory,
    handleNewChat,
    handleSessionChange,
    handleDeleteSession,
  };
};

export default useChatSessions;

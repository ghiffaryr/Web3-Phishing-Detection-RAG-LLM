"use client";
import { Box, Container } from "@mui/material";
import { useState, useRef, useEffect, useMemo } from "react";

// Import custom hooks
import useInitialization from "./hooks/useInitialization";
import useChatSessions from "./hooks/useChatSessions";
import useChatCompletion from "./hooks/useChatCompletion";

// Import components
import AppHeader from "./components/AppHeader";
import Sidebar from "./components/Sidebar";
import ChatInterface from "./components/ChatInterface";
import GlobalStyles from "./components/GlobalStyles";

// Import constants
import { themes } from "./constants/themes";

export default function Home() {
  // Define the sidebar width
  const drawerWidth = 280;

  // Add sidebar visibility state
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Toggle sidebar function
  const toggleSidebar = () => {
    setSidebarVisible((prev) => !prev);
  };

  // Initialize the app
  const {
    isInitialized,
    isHydrated,
    isMobile,
    currentTheme,
    initialChatSessions,
    changeTheme,
  } = useInitialization();

  // Auto-hide sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarVisible(false);
    }
  }, [isMobile]);

  // Initialize chat sessions
  const {
    chatSessions,
    activeSessionId,
    chatHistory,
    setChatHistory,
    handleNewChat,
    handleSessionChange,
    handleDeleteSession,
  } = useChatSessions(isInitialized);

  // Track the previous active session to detect changes
  const previousSessionRef = useRef(activeSessionId);

  // Force reset the completion state when changing sessions
  const [completionKey, setCompletionKey] = useState(0);

  // Track when the session changes and reset the completion
  useEffect(() => {
    // If the active session changed
    if (activeSessionId !== previousSessionRef.current) {
      console.log("Session changed, resetting completion state");

      // Increment the key to force re-mount the chat interface
      setCompletionKey((prev) => prev + 1);

      // Update the reference
      previousSessionRef.current = activeSessionId;
    }
  }, [activeSessionId]);

  // Initialize chat completion with the key to force remounting
  const {
    inputs,
    handleChange,
    displayedAnswer,
    isTyping,
    error,
    loading,
    currentTypingMessageId,
    handleSubmit: submitChat,
  } = useChatCompletion();

  // Create a separate state to temporarily suppress displayed answer during session changes
  const [shouldShowAnswer, setShouldShowAnswer] = useState(true);

  // Store last session ID to detect changes
  const lastSessionRef = useRef(activeSessionId);

  // Clear displayed content when session changes
  useEffect(() => {
    // If the session ID changed
    if (activeSessionId !== lastSessionRef.current) {
      // Immediately hide any answer from previous session
      setShouldShowAnswer(false);

      // Reset the flag after a short delay to allow for component updates
      const timer = setTimeout(() => {
        setShouldShowAnswer(true);
      }, 100);

      // Update ref
      lastSessionRef.current = activeSessionId;

      return () => clearTimeout(timer);
    }
  }, [activeSessionId]);

  // Override the session change handlers to ensure cleanup
  const handleSessionChangeWithCleanup = (sessionId: string) => {
    // Hide any displayed answer immediately
    setShouldShowAnswer(false);
    // Change session
    handleSessionChange(sessionId);
    // Reset the flag after a delay
    setTimeout(() => setShouldShowAnswer(true), 100);
  };

  const handleNewChatWithCleanup = () => {
    // Hide any displayed answer immediately
    setShouldShowAnswer(false);
    // Create new chat
    handleNewChat();
    // Reset the flag after a delay
    setTimeout(() => setShouldShowAnswer(true), 100);
  };

  // This state tracks if we're in the submission process
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File context state to temporarily store context from uploaded file
  const [fileContext, setFileContext] = useState<{
    context: string;
    fileName: string;
  } | null>(null);

  // Modified submit handler that clears old content first
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      setShouldShowAnswer(false);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // If we have file context, set it in the prompt
      if (fileContext) {
        // Create an enhanced prompt that includes file context for the API
        // But DON'T show this in the UI - the context is only for the backend
        const userQuestion = inputs.prompt.trim(); // Trim whitespace
        const enhancedPrompt = `The user is asking about the content of the file "${
          fileContext.fileName
        }". Here's the user's question: ${userQuestion}\n\nRelevant file context: ${fileContext.context.trim()}`;

        // Proceed with chat submission with enhanced prompt
        const result = await submitChat(
          chatHistory,
          setChatHistory,
          enhancedPrompt // The enhanced prompt is only sent to API, not shown to user
        );

        // Clear file context after submission
        setFileContext(null);
        setTimeout(() => setShouldShowAnswer(true), 100);
        return result;
      } else {
        // Proceed with regular chat submission
        const result = await submitChat(chatHistory, setChatHistory);

        // Allow showing answers again after a small delay
        setTimeout(() => setShouldShowAnswer(true), 100);

        return result;
      }
    } catch (error) {
      console.error("Chat submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle file context generated from file uploader
  const handleFileContextGenerated = (context: string, fileName: string) => {
    // Store the context and file name for the next message
    setFileContext({ context, fileName });

    // We don't need to add any visual feedback showing the context content
    console.log(
      `File "${fileName}" processed and ready to use in the next message.`
    );
  };

  // Get current theme configuration
  const theme = themes[currentTheme];

  // Handle key navigation in inputs
  const handleKeyNext = (event: React.KeyboardEvent, nextIndex: number) => {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  };

  // Handle enter key submission
  const handleKeyNextSubmit = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  // Handle session deletion with event stopping
  const handleDeleteSessionWithEvent = (
    eventOrId: React.MouseEvent | any,
    idOrEvent?: string | any
  ) => {
    // Determine which parameter is the event and which is the ID
    let event: any;
    let sessionId: string | undefined;

    console.log("Delete handler called with params:", { eventOrId, idOrEvent });

    // Check if the first parameter is an event (has stopPropagation)
    if (eventOrId && typeof eventOrId.stopPropagation === "function") {
      event = eventOrId;

      // Extract sessionId from attributes or data properties if available
      if (
        event.currentTarget &&
        event.currentTarget.dataset &&
        event.currentTarget.dataset.sessionId
      ) {
        sessionId = event.currentTarget.dataset.sessionId;
      } else if (typeof idOrEvent === "string") {
        sessionId = idOrEvent;
      }
    } else if (typeof eventOrId === "string") {
      // First parameter is the sessionId
      sessionId = eventOrId;
      event = idOrEvent;
    }

    // Stop event propagation if possible
    if (event && typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }

    console.log("Resolved sessionId:", sessionId);

    // Call delete function if we have a valid sessionId
    if (sessionId && typeof sessionId === "string") {
      handleDeleteSession(sessionId);
    } else {
      console.error("Could not determine a valid sessionId for deletion");
    }
  };

  // Use a session-based message cache that won't leak between sessions
  const [sessionMessageCaches, setSessionMessageCaches] = useState<
    Record<string, Record<string, string>>
  >({});

  // Track typing state reference for comparison
  const prevTypingRef = useRef(isTyping);
  const prevMsgIdRef = useRef(currentTypingMessageId);

  // Store displayedAnswer during typing (scoped to current session)
  useEffect(() => {
    if (
      isTyping &&
      currentTypingMessageId &&
      displayedAnswer &&
      activeSessionId
    ) {
      // Update the cache for the current session only
      setSessionMessageCaches((prev) => ({
        ...prev,
        [activeSessionId]: {
          ...(prev[activeSessionId] || {}),
          [currentTypingMessageId]: displayedAnswer,
        },
      }));
    }
  }, [isTyping, displayedAnswer, currentTypingMessageId, activeSessionId]);

  // Handle typing completion (when isTyping changes from true to false)
  useEffect(() => {
    if (
      prevTypingRef.current &&
      !isTyping &&
      currentTypingMessageId &&
      activeSessionId
    ) {
      console.log(
        `Typing finished for message ${currentTypingMessageId} in session ${activeSessionId}`
      );

      // Get the session cache or empty object if none
      const sessionCache = sessionMessageCaches[activeSessionId] || {};

      // Use the latest content (either displayed or cached)
      const finalContent =
        displayedAnswer || sessionCache[currentTypingMessageId];

      if (finalContent) {
        // Update the session cache
        setSessionMessageCaches((prev) => ({
          ...prev,
          [activeSessionId]: {
            ...(prev[activeSessionId] || {}),
            [currentTypingMessageId]: finalContent,
          },
        }));

        // Also update the chat history
        setChatHistory((prevHistory) =>
          prevHistory.map((msg) =>
            msg.id === currentTypingMessageId
              ? { ...msg, content: finalContent }
              : msg
          )
        );
      }
    }

    // Save current state for next comparison
    prevTypingRef.current = isTyping;
    prevMsgIdRef.current = currentTypingMessageId;
  }, [
    isTyping,
    currentTypingMessageId,
    displayedAnswer,
    sessionMessageCaches,
    activeSessionId,
    setChatHistory,
  ]);

  // Enhance the chat history with the session-specific cache
  const enhancedChatHistory = useMemo(() => {
    // Only process if we have a valid session and chat history
    if (!activeSessionId || !chatHistory || chatHistory.length === 0) {
      return chatHistory;
    }

    // Get the cache for the current session only
    const currentSessionCache = sessionMessageCaches[activeSessionId] || {};

    // Merge with chat history
    return chatHistory.map((msg) => {
      // If we have a cached version for this message in this session, use it
      if (currentSessionCache[msg.id]) {
        return { ...msg, content: currentSessionCache[msg.id] };
      }
      return msg;
    });
  }, [chatHistory, sessionMessageCaches, activeSessionId]);

  return (
    <Box
      sx={{
        backgroundColor: theme.background,
        color: theme.userTextColor,
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "120px", // Ensure space for the sticky form
      }}
    >
      {/* Sidebar with visibility control */}
      <Sidebar
        drawerWidth={drawerWidth}
        theme={theme}
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        handleNewChat={handleNewChatWithCleanup}
        handleSessionChange={handleSessionChangeWithCleanup}
        handleDeleteSession={handleDeleteSessionWithEvent}
        isHydrated={isHydrated}
        isMobile={isMobile}
        visible={sidebarVisible}
        toggleSidebar={toggleSidebar} // Add toggleSidebar prop
      />

      {/* App header with sidebar toggle */}
      <AppHeader
        theme={theme}
        themes={themes}
        currentTheme={currentTheme}
        changeTheme={changeTheme}
        sidebarWidth={drawerWidth}
        sidebarVisible={sidebarVisible}
        toggleSidebar={toggleSidebar}
      />

      {/* Main content area - direct flow with main page scroll */}
      <Box
        component="main"
        onClick={() => {
          // Close sidebar when clicking main area (especially helpful on mobile)
          if (isMobile && sidebarVisible) {
            toggleSidebar();
          }
        }}
        sx={{
          flexGrow: 1,
          width: {
            xs: "100%",
            md: sidebarVisible ? `calc(100% - ${drawerWidth}px)` : "100%",
          },
          ml: {
            xs: 0,
            md: sidebarVisible ? `${drawerWidth}px` : 0,
          },
          pt: 8, // Add padding for AppBar height
          transition: "margin-left 0.3s, width 0.3s",
        }}
      >
        {/* Use the key to force remount when switching sessions */}
        <div
          key={`chat-interface-${completionKey}-${activeSessionId}`}
          style={{ width: "100%" }}
        >
          <ChatInterface
            theme={theme}
            chatSessions={chatSessions}
            activeSessionId={activeSessionId}
            isHydrated={isHydrated}
            isMobile={isMobile}
            chatHistory={enhancedChatHistory}
            inputs={inputs}
            handleChange={handleChange}
            handleKeyNext={handleKeyNext}
            handleKeyNextSubmit={handleKeyNextSubmit}
            handleSubmit={handleSubmit}
            displayedAnswer={shouldShowAnswer ? displayedAnswer : ""}
            currentTypingMessageId={currentTypingMessageId}
            isTyping={isTyping}
            error={error}
            loading={loading || isSubmitting}
            onFileContextGenerated={handleFileContextGenerated}
            sidebarVisible={sidebarVisible}
            toggleSidebar={toggleSidebar} // Pass toggle function to ChatInterface
          />
        </div>
      </Box>

      <GlobalStyles theme={theme} />
    </Box>
  );
}

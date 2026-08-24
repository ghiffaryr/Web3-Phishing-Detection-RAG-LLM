import { Box, Typography } from "@mui/material";
import { useEffect } from "react";
import { ChatMessage, ThemeConfig } from "../types/chat";
import MessageBubble from "./MessageBubble";

interface ChatAreaProps {
  chatHistory: ChatMessage[];
  theme: ThemeConfig;
  displayedAnswer: string;
  currentTypingMessageId: string | null;
  isTyping: boolean;
  chatSessions: any[];
  activeSessionId: string;
  isHydrated: boolean;
}

export const ChatArea = ({
  chatHistory,
  theme,
  displayedAnswer,
  currentTypingMessageId,
  isTyping,
  chatSessions,
  activeSessionId,
  isHydrated,
}: ChatAreaProps) => {
  // Auto-scroll to bottom when history changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatHistory, displayedAnswer]);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "800px",
        margin: "0 auto",
        mb: "60px", // Reduced bottom margin for dock-like form
        px: { xs: 2, sm: 3, md: 0 }, // Add horizontal padding for smaller screens
      }}
    >
      {/* Chat info header - aligned with messages */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
          mt: { xs: 1, sm: 2 }, // Add top margin for smaller screens
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            color: theme.userTextColor,
            fontSize: { xs: "0.95rem", md: "1rem" },
          }}
        >
          Conversation
        </Typography>

        <Typography
          variant="caption"
          sx={{ color: theme.inputLabelColor, opacity: 0.8 }}
        >
          {isHydrated ? (
            <>
              Chat {chatSessions.findIndex((s) => s.id === activeSessionId) + 1}{" "}
              of {chatSessions.length}
              {chatHistory.length > 0
                ? ` • ${chatHistory.length} messages`
                : " • New conversation"}
            </>
          ) : (
            "Loading conversation..."
          )}
        </Typography>
      </Box>

      {/* Chat content */}
      {chatHistory.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "40vh", // Reduced height
            color: theme.inputLabelColor,
            backgroundColor: theme.containerBackground,
            borderRadius: 2,
            border: `1px solid ${theme.borderColor}`,
            p: 3,
            mb: 2,
          }}
        >
          <Typography variant="body2" align="center">
            Start a conversation by entering a prompt below
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            mb: 2,
            // Add breathing room between messages on smaller screens
            "& > *": {
              my: { xs: 1.5, sm: 2, md: 2 },
            },
          }}
        >
          {chatHistory.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              theme={theme}
              displayedAnswer={displayedAnswer}
              currentTypingMessageId={currentTypingMessageId}
              isTyping={isTyping}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ChatArea;

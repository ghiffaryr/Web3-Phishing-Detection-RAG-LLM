import { Box, useMediaQuery, useTheme as useMuiTheme } from "@mui/material";
import { ChatMessage, ThemeConfig, ChatSession } from "../types/chat";
import ChatArea from "./ChatArea";
import ChatForm from "./ChatForm";
import { useCallback } from "react";

interface ChatInterfaceProps {
  theme: ThemeConfig;
  chatSessions: ChatSession[];
  activeSessionId: string;
  isHydrated: boolean;
  isMobile: boolean;
  chatHistory: ChatMessage[];
  inputs: {
    model_name: string;
    prompt: string;
  };
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyNext: (event: React.KeyboardEvent, nextIndex: number) => void;
  handleKeyNextSubmit: (event: React.KeyboardEvent) => void;
  handleSubmit: () => void;
  displayedAnswer: string;
  currentTypingMessageId: string | null;
  isTyping: boolean;
  error: string;
  loading: boolean;
  onFileContextGenerated?: (context: string, fileName: string) => void;
  sidebarVisible: boolean;
  toggleSidebar?: () => void; // Add optional toggle function
}

export const ChatInterface = ({
  theme,
  chatSessions,
  activeSessionId,
  isHydrated,
  isMobile,
  chatHistory,
  inputs,
  handleChange,
  handleKeyNext,
  handleKeyNextSubmit,
  handleSubmit,
  displayedAnswer,
  currentTypingMessageId,
  isTyping,
  error,
  loading,
  onFileContextGenerated,
  sidebarVisible,
  toggleSidebar,
}: ChatInterfaceProps) => {
  const muiTheme = useMuiTheme();
  // Use the built-in MUI breakpoint system for consistency
  const isMdUp = useMediaQuery(muiTheme.breakpoints.up("md"));
  const isMobileView = useMediaQuery(muiTheme.breakpoints.down("md"));

  // Calculate actual sidebar impact on layout
  const sidebarAffectsLayout = isMdUp && sidebarVisible;

  // Handle click on main area to close sidebar (mobile only)
  const handleContentClick = useCallback(() => {
    if (isMobileView && sidebarVisible && toggleSidebar) {
      toggleSidebar();
    }
  }, [isMobileView, sidebarVisible, toggleSidebar]);

  return (
    <Box
      sx={{ width: "100%" }}
      onClick={handleContentClick} // Add click handler to close sidebar
    >
      {/* Chat messages - uses main page scroll */}
      <ChatArea
        chatHistory={chatHistory}
        theme={theme}
        displayedAnswer={displayedAnswer}
        currentTypingMessageId={currentTypingMessageId}
        isTyping={isTyping}
        chatSessions={chatSessions}
        activeSessionId={activeSessionId}
        isHydrated={isHydrated}
      />

      {/* Dock-like form at the bottom with auto-growing height */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: { xs: 0, md: sidebarVisible ? "280px" : 0 },
          right: 0,
          zIndex: 1200,
          padding: { xs: "8px", md: "10px" },
          transition: "left 0.3s",
          backgroundColor: `${theme.background}e8`,
          backdropFilter: "blur(10px)",
          borderTop: `1px solid ${theme.borderColor}`,
          boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
          maxWidth: {
            xs: "100%",
            md: sidebarVisible ? `calc(100% - 280px)` : "100%",
          },
          maxHeight: "40vh", // Set maximum height for very large inputs
          overflowY: "auto", // Add scrolling if needed
        }}
      >
        <Box
          sx={{
            maxWidth: "800px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <ChatForm
              inputs={inputs}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              handleKeyNext={handleKeyNext}
              handleKeyNextSubmit={handleKeyNextSubmit}
              theme={theme}
              loading={loading}
              error={error}
              isMobile={isMobile}
              isTyping={isTyping}
              onFileContextGenerated={onFileContextGenerated}
              compact={true}
              dockMode={true}
            />
          </form>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatInterface;

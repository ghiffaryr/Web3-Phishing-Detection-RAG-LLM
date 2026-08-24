import { Paper, Typography, Box } from "@mui/material";
import { ChatMessage } from "../types/chat";
import { ThemeConfig } from "../types/chat";
import FormattedText from "./FormattedText";

interface MessageBubbleProps {
  message: ChatMessage;
  theme: ThemeConfig;
  displayedAnswer: string;
  currentTypingMessageId: string | null;
  isTyping: boolean;
}

export const MessageBubble = ({
  message,
  theme,
  displayedAnswer,
  currentTypingMessageId,
  isTyping,
}: MessageBubbleProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: message.role === "user" ? "flex-end" : "flex-start",
        mb: { xs: 1, md: 2 },
      }}
    >
      <Paper
        elevation={1}
        sx={{
          p: { xs: 1, md: 1.5 },
          maxWidth: { xs: "85%", sm: "80%" },
          backgroundColor:
            message.role === "user"
              ? theme.userBubbleBackground
              : theme.assistantBubbleBackground,
          color:
            message.role === "user"
              ? theme.userTextColor
              : theme.assistantTextColor,
          borderRadius:
            message.role === "user" ? "18px 18px 0 18px" : "18px 18px 18px 0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
        }}
      >
        {message.role === "user" ? (
          <Typography
            sx={{
              fontSize: { xs: "0.9rem", md: "1rem" },
              wordBreak: "break-word",
              textAlign: "justify",
            }}
          >
            {message.content}
          </Typography>
        ) : (
          <FormattedText
            text={
              message.id === currentTypingMessageId
                ? displayedAnswer
                : message.content
            }
            isTyping={message.id === currentTypingMessageId && isTyping}
          />
        )}
      </Paper>
    </Box>
  );
};

export default MessageBubble;

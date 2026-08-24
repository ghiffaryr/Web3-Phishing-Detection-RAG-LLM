import {
  Box,
  Typography,
  IconButton,
  Button,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Drawer,
  useMediaQuery,
  useTheme as useMuiTheme,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChatIcon from "@mui/icons-material/Chat";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import { ChatSession, ThemeConfig } from "../types/chat";
import { getChatTitle, formatSessionDate } from "../utils/formatting";
import { useEffect, useState } from "react";

interface SidebarProps {
  drawerWidth: number;
  theme: ThemeConfig;
  chatSessions: ChatSession[];
  activeSessionId: string;
  handleNewChat: () => void;
  handleSessionChange: (sessionId: string) => void;
  handleDeleteSession: (sessionId: string, event: React.MouseEvent) => void;
  isHydrated: boolean;
  isMobile: boolean;
  visible: boolean;
  toggleSidebar: () => void; // Add toggleSidebar prop
}

export const Sidebar = ({
  drawerWidth,
  theme,
  chatSessions,
  activeSessionId,
  handleNewChat,
  handleSessionChange,
  handleDeleteSession,
  isHydrated,
  isMobile,
  visible,
  toggleSidebar,
}: SidebarProps) => {
  const muiTheme = useMuiTheme();
  const isMobileView = useMediaQuery(muiTheme.breakpoints.down("md"));

  // Track actual sidebar visibility that responds to both props and screen size
  const [actualVisibility, setActualVisibility] = useState(
    visible && !isMobileView
  );

  // Update visibility whenever screen size or props change
  useEffect(() => {
    if (isMobileView) {
      // On mobile, visibility is controlled by the visible prop
      setActualVisibility(visible);
    } else {
      // On desktop, always show if visible is true
      setActualVisibility(visible);
    }
  }, [isMobileView, visible]);

  // Handler for toggle button click
  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSidebar();
  };

  // Use Paper for desktop permanent drawer and Drawer for mobile
  const sidebarContent = (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center", // Center items vertically
          justifyContent: "space-between",
          borderBottom: `1px solid ${theme.borderColor}`,
          height: { xs: 56, sm: 64, md: 70 }, // Exact same height as AppBar
          px: 2, // Horizontal padding only
          py: 0, // Remove vertical padding and use height+centering instead
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: theme.userTextColor,
            // No extra margins needed with proper vertical centering
          }}
        >
          Chats
        </Typography>

        {/* Sidebar toggle button aligned exactly with header toggle */}
        <Tooltip title="Hide sidebar">
          <IconButton
            onClick={toggleSidebar}
            sx={{
              color: theme.userTextColor,
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
              },
              // Remove any vertical margins to rely on flex centering
            }}
          >
            <MenuOpenIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* New Chat button in sidebar */}
      <Button
        onClick={handleNewChat}
        startIcon={<AddIcon />}
        variant="outlined"
        sx={{
          margin: 2,
          color: theme.userTextColor,
          borderColor: theme.inputBorderColor,
          "&:hover": {
            backgroundColor: theme.userBubbleBackground,
            borderColor: theme.userTextColor,
          },
        }}
      >
        New Chat
      </Button>

      <Divider sx={{ borderColor: theme.borderColor }} />

      {/* Chat list */}
      <List sx={{ pt: 0, overflowY: "auto", pb: "140px" }}>
        {" "}
        {/* Added padding to account for the chat form drawer */}
        {isHydrated &&
          chatSessions.map((session) => (
            <ListItem
              disablePadding
              key={session.id}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  sx={{
                    color: theme.inputLabelColor,
                    "&:hover": {
                      color: "#ff6b6b",
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemButton
                onClick={() => {
                  if (session.id !== activeSessionId) {
                    handleSessionChange(session.id);
                  }
                }}
                sx={{
                  backgroundColor:
                    session.id === activeSessionId
                      ? theme.userBubbleBackground
                      : "transparent",
                  "&:hover": {
                    backgroundColor:
                      session.id === activeSessionId
                        ? theme.userBubbleBackground
                        : "rgba(255,255,255,0.05)",
                  },
                  pr: 6,
                }}
              >
                <ListItemIcon sx={{ color: theme.userTextColor, minWidth: 36 }}>
                  <ChatIcon />
                </ListItemIcon>
                <ListItemText
                  primary={getChatTitle(session)}
                  secondary={formatSessionDate(session.created)}
                  primaryTypographyProps={{
                    noWrap: true,
                    style: { color: theme.userTextColor },
                  }}
                  secondaryTypographyProps={{
                    style: { color: theme.inputLabelColor },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    </Box>
  );

  if (isMobileView) {
    return (
      <Drawer
        variant="temporary"
        open={actualVisibility}
        onClose={toggleSidebar}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: theme.cardBackground,
            color: theme.userTextColor,
            borderRight: `1px solid ${theme.borderColor}`,
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        width: drawerWidth,
        height: "100vh",
        position: "fixed",
        left: actualVisibility ? 0 : -drawerWidth,
        top: 0,
        zIndex: 100,
        backgroundColor: theme.cardBackground,
        color: theme.userTextColor,
        borderRight: `1px solid ${theme.borderColor}`,
        display: "block", // Always render but may be off-screen
        overflow: "hidden",
        transition: "left 0.3s ease-in-out", // Smoother transition
      }}
    >
      {sidebarContent}
    </Paper>
  );
};

export default Sidebar;

import {
  AppBar,
  Container,
  Typography,
  Box,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import { ThemeConfig } from "../types/chat";
import { useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";

interface AppHeaderProps {
  theme: ThemeConfig;
  themes: Record<string, ThemeConfig>;
  currentTheme: string;
  changeTheme: (themeKey: string) => void;
  sidebarWidth: number;
  sidebarVisible: boolean;
  toggleSidebar: () => void;
}

export const AppHeader = ({
  theme,
  themes,
  currentTheme,
  changeTheme,
  sidebarWidth,
  sidebarVisible,
  toggleSidebar,
}: AppHeaderProps) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(menuAnchor);

  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleThemeChange = (themeKey: string) => {
    changeTheme(themeKey);
    handleThemeMenuClose();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        backgroundColor: theme.appBar,
        width: {
          xs: "100%",
          md: sidebarVisible ? `calc(100% - ${sidebarWidth}px)` : "100%",
        },
        ml: { xs: 0, md: sidebarVisible ? `${sidebarWidth}px` : 0 },
        zIndex: 1200,
        transition: "margin-left 0.3s, width 0.3s",
        height: { xs: 56, sm: 64, md: 70 }, // Explicitly set height to match sidebar
      }}
    >
      <Container
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          py: { xs: 0.5, sm: 0.75, md: 1 },
          position: "relative",
          height: "100%", // Fill the container height
        }}
      >
        {!sidebarVisible && (
          <Tooltip title="Show sidebar">
            <IconButton
              color="inherit"
              onClick={toggleSidebar}
              sx={{
                position: "absolute",
                left: { xs: 8, sm: 12, md: 16 },
                color: theme.userTextColor,
                display: sidebarVisible ? "none" : "flex",
              }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
        )}

        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            letterSpacing: { xs: ".2rem", md: ".3rem" },
            fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.75rem" },
            color: theme.userTextColor,
          }}
        >
          AI ASSISTANT
        </Typography>

        <Box
          sx={{
            position: "absolute",
            right: { xs: 8, sm: 12, md: 16 },
            display: "flex",
            gap: 1,
          }}
        >
          <Button
            onClick={handleThemeMenuOpen}
            variant="text"
            size="small"
            sx={{
              color: theme.userTextColor,
              minWidth: "auto",
              padding: { xs: "4px 8px", md: "6px 10px" },
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
              },
            }}
          >
            Theme
          </Button>
        </Box>

        <Menu
          anchorEl={menuAnchor}
          open={open}
          onClose={handleThemeMenuClose}
          MenuListProps={{
            "aria-labelledby": "theme-button",
          }}
          PaperProps={{
            sx: {
              backgroundColor: theme.cardBackground,
              color: theme.userTextColor,
              border: `1px solid ${theme.borderColor}`,
            },
          }}
        >
          {Object.entries(themes).map(([key, value]) => (
            <MenuItem
              key={key}
              onClick={() => handleThemeChange(key)}
              sx={{
                backgroundColor:
                  currentTheme === key
                    ? `${value.userBubbleBackground} !important`
                    : "transparent",
                "&:hover": {
                  backgroundColor: value.userBubbleBackground,
                },
              }}
            >
              {value.name}
            </MenuItem>
          ))}
        </Menu>
      </Container>
    </AppBar>
  );
};

export default AppHeader;

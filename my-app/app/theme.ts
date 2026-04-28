"use client";

import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
    primary: {
      main: "#3b9d6e",
    },
    secondary: {
      main: "#547AA5",
    },
    background: {
      default: "#0a0a0a",
      paper: "#1a1a1a",
    },
    text: {
      primary: "#ededed",
      secondary: "#b3b3b3",
    },
    divider: "rgba(255, 255, 255, 0.12)",
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
    h1: {
      fontSize: "2.75rem",
      fontWeight: 600,
      letterSpacing: "-0.02em",
      lineHeight: 1.1,
    },
    body1: {
      fontSize: "1.05rem",
      lineHeight: 1.5,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          paddingTop: 10,
          paddingBottom: 10,
        },
      },
    },
  },
});

export default theme;

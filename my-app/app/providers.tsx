"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import { PantryProvider } from "@/context/PantryContext";
import { ScannedProvider } from "@/context/ScannedContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <PantryProvider>
          <ScannedProvider>{children}</ScannedProvider>
        </PantryProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}

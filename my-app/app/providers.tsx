"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { SessionProvider } from "next-auth/react";
import theme from "./theme";
import { PantryProvider } from "@/context/PantryContext";
import { StagedIngredientsProvider } from "@/context/StagedIngredientsContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <SessionProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <PantryProvider>
            <StagedIngredientsProvider>{children}</StagedIngredientsProvider>
          </PantryProvider>
        </ThemeProvider>
      </SessionProvider>
    </AppRouterCacheProvider>
  );
}

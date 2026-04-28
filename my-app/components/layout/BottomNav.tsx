"use client";

import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/hub", label: "Home", icon: <HomeIcon /> },
  { href: "/recommendations", label: "Recipes", icon: <RestaurantMenuIcon /> },
  { href: "/favorites", label: "Saved", icon: <FavoriteIcon /> },
] as const;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const activeIndex = TABS.findIndex(
    (tab) => pathname === tab.href || pathname.startsWith(tab.href + "/"),
  );

  return (
    <Paper
      elevation={0}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        borderTop: 1,
        borderColor: "divider",
        zIndex: (theme) => theme.zIndex.appBar,
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      <BottomNavigation
        showLabels
        value={activeIndex === -1 ? 0 : activeIndex}
        onChange={(_, newValue) => router.push(TABS[newValue].href)}
      >
        {TABS.map((tab) => (
          <BottomNavigationAction
            key={tab.href}
            label={tab.label}
            icon={tab.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { AppBar, Box, IconButton, Toolbar, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

type Props = {
  title?: string;
  showBack?: boolean;
  action?: React.ReactNode;
  transparent?: boolean;
};

export default function PageHeader({ title, showBack, action, transparent }: Props) {
  const router = useRouter();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: transparent ? "transparent" : "background.paper",
        color: "text.primary",
        borderBottom: transparent ? 0 : 1,
        borderColor: "divider",
        boxShadow: transparent ? "none" : "0 1px 2px rgba(0, 0, 0, 0.04)",
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {showBack && (
          <IconButton edge="start" onClick={() => router.back()} aria-label="Back">
            <ArrowBackIcon />
          </IconButton>
        )}
        {title && (
          <Typography variant="h6" noWrap sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        {action}
      </Toolbar>
    </AppBar>
  );
}

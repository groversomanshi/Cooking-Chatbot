"use client";

import Link from "next/link";
import { Box, Card, CardActionArea, Stack, Typography } from "@mui/material";

type HubTileProps = {
  href: string;
  title: string;
  subtitle: string;
  emoji: string;
};

export default function HubTile({ href, title, subtitle, emoji }: HubTileProps) {
  return (
    <Card variant="outlined" sx={{ borderColor: "divider" }}>
      <CardActionArea component={Link} href={href} sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 2,
              bgcolor: "action.hover",
              fontSize: 24,
            }}
          >
            {emoji}
          </Box>
          <Stack>
            <Typography fontWeight={500}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

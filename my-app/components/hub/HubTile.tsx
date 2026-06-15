"use client";

import Link from "next/link";
import { Box, Card, CardActionArea, Stack, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

type HubTileProps = {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
};

export default function HubTile({ href, title, subtitle, icon }: HubTileProps) {
  return (
    <Card variant="outlined" sx={{ borderColor: "divider" }}>
      <CardActionArea component={Link} href={href} sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 2,
              bgcolor: "primary.light",
              color: "primary.dark",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 500 }}>{title}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {subtitle}
            </Typography>
          </Stack>
          <ChevronRightIcon sx={{ color: "text.disabled" }} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}

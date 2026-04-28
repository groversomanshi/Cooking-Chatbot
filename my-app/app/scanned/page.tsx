"use client";

import Link from "next/link";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import PageHeader from "@/components/layout/PageHeader";
import ScannedItemCard from "@/components/scanned/ScannedItemCard";
import { useScannedItems } from "@/hooks/useScannedItems";

export default function ScannedPage() {
  const { items, removeItem } = useScannedItems();

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <PageHeader title="Scanned items" showBack />

      <Container maxWidth="sm" sx={{ flex: 1, py: 2 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Review what was detected. Remove anything that looks wrong.
          </Typography>

          <Stack spacing={1}>
            {items.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                align="center"
                sx={{ py: 6 }}
              >
                No items scanned yet.
              </Typography>
            ) : (
              items.map((item) => (
                <ScannedItemCard
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                />
              ))
            )}
          </Stack>
        </Stack>
      </Container>

      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          bgcolor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(8px)",
          borderTop: 1,
          borderColor: "divider",
          px: 2,
          py: 2,
          pb: "calc(env(safe-area-inset-bottom) + 16px)",
        }}
      >
        <Container maxWidth="sm" disableGutters>
          <Button
            component={Link}
            href="/recommendations"
            variant="contained"
            size="large"
            disabled={items.length === 0}
            fullWidth
            sx={{ borderRadius: 999, py: 1.5 }}
          >
            Get recipes
          </Button>
        </Container>
      </Box>
    </Box>
  );
}

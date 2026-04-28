"use client";

import Link from "next/link";
import { Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";
import BackButton from "@/components/layout/BackButton";
import ScannedItemCard from "@/components/scanned/ScannedItemCard";
import { useScannedItems } from "@/hooks/useScannedItems";

export default function ScannedPage() {
  const { items, removeItem } = useScannedItems();

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <Toolbar sx={{ gap: 1.5 }}>
        <BackButton />
        <Typography variant="h6" fontWeight={500}>
          Scanned items
        </Typography>
      </Toolbar>

      <Container maxWidth="sm" sx={{ py: 2 }}>
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

          <Button
            component={Link}
            href="/recommendations"
            variant="contained"
            size="large"
            sx={{ borderRadius: 999, py: 1.5, mt: 2 }}
          >
            Get recipes
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

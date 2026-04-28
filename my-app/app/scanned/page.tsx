"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PageHeader from "@/components/layout/PageHeader";
import AddIngredientDialog from "@/components/pantry/AddIngredientDialog";
import ScannedItemCard from "@/components/scanned/ScannedItemCard";
import { useScannedItems } from "@/hooks/useScannedItems";

export default function ScannedPage() {
  const { items, addItems, removeItem } = useScannedItems();
  const [addOpen, setAddOpen] = useState(false);

  function handleAdd({ name, quantity }: { name: string; quantity?: string }) {
    addItems([{ id: crypto.randomUUID(), name, quantity }]);
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
    >
      <PageHeader
        title="Scanned items"
        showBack
        action={
          <IconButton
            onClick={() => setAddOpen(true)}
            aria-label="Add ingredient manually"
            color="primary"
          >
            <AddIcon />
          </IconButton>
        }
      />

      <Container maxWidth="sm" sx={{ flex: 1, py: 2 }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Review what was detected. Remove anything that looks wrong, or add
            anything we missed.
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
          bgcolor: "background.paper",
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

      <AddIngredientDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
    </Box>
  );
}

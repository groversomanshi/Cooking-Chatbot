"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
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
import { useScannedItems } from "@/context/ScannedContext";
import { usePantry } from "@/context/PantryContext";
import { useAuth } from "@/hooks/useAuth";
import type { Ingredient } from "@/types/ingredient";

export default function ScannedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, addItems, removeItem, clear } = useScannedItems();
  const { addIds } = usePantry();
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matched = items.filter((i) => i.ingredientId != null);

  function handleAdd(ingredient: Ingredient) {
    addItems([
      {
        id: crypto.randomUUID(),
        name: ingredient.name,
        ingredientId: ingredient.ingredientId,
      },
    ]);
  }

  async function handleSaveAndContinue() {
    setError(null);
    if (!user) {
      setError("Log in to save these to your pantry.");
      return;
    }
    setSaving(true);
    try {
      const ids = matched.map((i) => i.ingredientId as number);
      await addIds(ids);
      clear();
      router.push("/pantry");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save to pantry");
    } finally {
      setSaving(false);
    }
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
            anything we missed. These items live only in this scan session — they
            won&apos;t be saved until you tap &quot;Add to pantry&quot;.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

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
            onClick={handleSaveAndContinue}
            variant="contained"
            size="large"
            disabled={matched.length === 0 || saving}
            fullWidth
            sx={{ borderRadius: 999, py: 1.5 }}
          >
            {saving
              ? "Saving…"
              : `Add to pantry (${matched.length}${
                  items.length !== matched.length ? `/${items.length}` : ""
                })`}
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

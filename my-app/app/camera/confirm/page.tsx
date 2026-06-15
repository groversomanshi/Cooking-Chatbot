"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import PageHeader from "@/components/layout/PageHeader";
import AddIngredientDialog from "@/components/pantry/AddIngredientDialog";
import { useStagedIngredients } from "@/context/StagedIngredientsContext";
import { usePantry } from "@/context/PantryContext";
import { useAuth } from "@/hooks/useAuth";
import type { Ingredient } from "@/types/ingredient";

export default function ConfirmStagedPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, add, remove, clear } = useStagedIngredients();
  const { addIds } = usePantry();

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleManualAdd(ingredient: Ingredient) {
    add(ingredient);
  }

  async function handleConfirm() {
    if (items.length === 0) return;
    setError(null);
    if (!user) {
      setError("Log in to save these to your pantry.");
      return;
    }
    setSaving(true);
    try {
      await addIds(items.map((i) => i.ingredientId));
      clear();
      router.push("/pantry");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save to pantry");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    clear();
    router.push("/camera");
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
        title="Review ingredients"
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
            These ingredients will be added to your pantry. Remove anything that
            looks wrong, or use the <strong>+</strong> button to add anything we
            missed.
          </Typography>

          {!user && !authLoading && (
            <Alert severity="info">Log in before confirming.</Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          {items.length === 0 ? (
            <Stack spacing={2} sx={{ alignItems: "center", py: 6 }}>
              <Typography variant="body2" color="text.secondary" align="center">
                Nothing to review yet.
                <br />
                Go back to the camera and accept some ingredients first.
              </Typography>
              <Button
                onClick={() => router.push("/camera")}
                variant="outlined"
              >
                Back to camera
              </Button>
            </Stack>
          ) : (
            <Stack spacing={1}>
              {items.map((item) => (
                <Card
                  key={item.ingredientId}
                  variant="outlined"
                  sx={{ borderColor: "divider" }}
                >
                  <CardContent
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: 1.5,
                      "&:last-child": { pb: 1.5 },
                    }}
                  >
                    <Stack>
                      <Typography>{item.name}</Typography>
                      {item.restrictions && item.restrictions.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {item.restrictions.join(", ")}
                        </Typography>
                      )}
                    </Stack>
                    <IconButton
                      edge="end"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => remove(item.ingredientId)}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      </Container>

      {items.length > 0 && (
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
            <Stack direction="row" spacing={1.5}>
              <Button
                onClick={handleCancel}
                variant="outlined"
                size="large"
                disabled={saving}
                sx={{ borderRadius: 999, py: 1.5, flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                variant="contained"
                size="large"
                disabled={saving || !user}
                sx={{ borderRadius: 999, py: 1.5, flex: 2 }}
              >
                {saving
                  ? "Saving…"
                  : `Confirm and add ${items.length} to pantry`}
              </Button>
            </Stack>
          </Container>
        </Box>
      )}

      <AddIngredientDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleManualAdd}
      />
    </Box>
  );
}

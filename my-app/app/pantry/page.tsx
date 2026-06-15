"use client";

import { useState } from "react";
import Link from "next/link";
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
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import PageHeader from "@/components/layout/PageHeader";
import AddIngredientDialog from "@/components/pantry/AddIngredientDialog";
import { usePantry } from "@/context/PantryContext";
import { useAuth } from "@/hooks/useAuth";
import type { Ingredient } from "@/types/ingredient";

export default function PantryPage() {
  const { user, loading: authLoading } = useAuth();
  const { items, loading, error, addIds, removeId } = usePantry();
  const [addOpen, setAddOpen] = useState(false);

  async function handleAdd(ingredient: Ingredient) {
    await addIds([ingredient.ingredientId]);
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
        title="My pantry"
        showBack
        action={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <IconButton
              onClick={() => setAddOpen(true)}
              aria-label="Add ingredient manually"
              color="primary"
              disabled={!user}
            >
              <AddIcon />
            </IconButton>
            <Button
              component={Link}
              href="/camera"
              startIcon={<CameraAltIcon />}
              size="small"
              color="primary"
            >
              Scan
            </Button>
          </Stack>
        }
      />

      <Container maxWidth="sm" sx={{ flex: 1, py: 2 }}>
        {!user && !authLoading ? (
          <Alert severity="info">
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="body2">Log in to view your pantry.</Typography>
              <Button component={Link} href="/login" size="small">
                Log in
              </Button>
            </Stack>
          </Alert>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : loading ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 6 }}>
            Loading your pantry…
          </Typography>
        ) : items.length === 0 ? (
          <Stack spacing={2} sx={{ alignItems: "center", py: 8 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              Your pantry is empty.
              <br />
              Scan your fridge or add ingredients manually.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button
                component={Link}
                href="/camera"
                variant="outlined"
                startIcon={<CameraAltIcon />}
              >
                Scan
              </Button>
              <Button
                onClick={() => setAddOpen(true)}
                variant="outlined"
                startIcon={<AddIcon />}
              >
                Add manually
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={1}>
            {items.map((item) => (
              <Card key={item.ingredientId} variant="outlined" sx={{ borderColor: "divider" }}>
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
                    onClick={() => removeId(item.ingredientId)}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
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
            <Button
              component={Link}
              href="/recommendations"
              variant="contained"
              size="large"
              fullWidth
              sx={{ borderRadius: 999, py: 1.5 }}
            >
              Find recipes ({items.length} {items.length === 1 ? "ingredient" : "ingredients"})
            </Button>
          </Container>
        </Box>
      )}

      <AddIngredientDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />
    </Box>
  );
}

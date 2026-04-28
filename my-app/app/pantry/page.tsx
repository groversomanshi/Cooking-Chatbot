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
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PageHeader from "@/components/layout/PageHeader";
import AddIngredientDialog from "@/components/pantry/AddIngredientDialog";
import ScannedItemCard from "@/components/scanned/ScannedItemCard";
import { useScannedItems } from "@/hooks/useScannedItems";

export default function PantryPage() {
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
        title="My pantry"
        showBack
        action={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <IconButton
              onClick={() => setAddOpen(true)}
              aria-label="Add ingredient manually"
              color="primary"
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
        {items.length === 0 ? (
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
              <ScannedItemCard
                key={item.id}
                item={item}
                onRemove={() => removeItem(item.id)}
              />
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

"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (item: { name: string; quantity?: string }) => void;
};

export default function AddIngredientDialog({ open, onClose, onAdd }: Props) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  function reset() {
    setName("");
    setQuantity("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const trimmedQuantity = quantity.trim();
    onAdd({
      name: trimmedName,
      quantity: trimmedQuantity || undefined,
    });
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add ingredient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              label="Ingredient"
              placeholder="e.g. Spinach"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              fullWidth
              label="Quantity (optional)"
              placeholder="e.g. 2 cups, 200g, 3 cans"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={!name.trim()}>
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

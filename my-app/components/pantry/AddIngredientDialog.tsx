"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Autocomplete,
  type AutocompleteRenderInputParams,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { searchIngredients } from "@/lib/api/ingredients";
import type { Ingredient } from "@/types/ingredient";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Receives the matched ingredient row (so the caller has the bigint id). */
  onAdd: (ingredient: Ingredient) => void | Promise<void>;
};

export default function AddIngredientDialog({ open, onClose, onAdd }: Props) {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Ingredient[]>([]);
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const q = input.trim();
    if (!q) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = setTimeout(() => {
      searchIngredients(q)
        .then((rows) => {
          if (!cancelled) setOptions(rows);
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [input, open]);

  function reset() {
    setInput("");
    setSelected(null);
    setOptions([]);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await onAdd(selected);
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  function renderIngredientInput(params: AutocompleteRenderInputParams) {
    const inputProps = (
      params as typeof params & {
        InputProps?: { endAdornment?: ReactNode };
      }
    ).InputProps;

    return (
      <TextField
        {...params}
        autoFocus
        label="Ingredient"
        placeholder="e.g. spinach"
        slotProps={{
          input: {
            ...inputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress size={16} />}
                {inputProps?.endAdornment}
              </>
            ),
          },
        }}
      />
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit}>
        <DialogTitle>Add ingredient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Autocomplete
              autoFocus
              options={options}
              value={selected}
              onChange={(_, value) => setSelected(value)}
              inputValue={input}
              onInputChange={(_, value) => setInput(value)}
              getOptionLabel={(opt) => opt.name}
              isOptionEqualToValue={(a, b) => a.ingredientId === b.ingredientId}
              loading={loading}
              filterOptions={(x) => x}
              noOptionsText={input.trim() ? "No matches" : "Start typing…"}
              renderInput={renderIngredientInput}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={!selected || submitting}>
            {submitting ? "Adding…" : "Add"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

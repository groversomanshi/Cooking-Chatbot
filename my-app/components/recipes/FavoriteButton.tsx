"use client";

import { useState } from "react";
import { Button } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { toggleFavorite } from "@/lib/api/recipes";

export default function FavoriteButton({
  recipeId,
  initial = false,
}: {
  recipeId: string;
  initial?: boolean;
}) {
  const [favorited, setFavorited] = useState(initial);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    const next = !favorited;
    setFavorited(next);
    try {
      await toggleFavorite(recipeId, next);
    } catch {
      setFavorited(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={pending}
      aria-pressed={favorited}
      variant={favorited ? "contained" : "outlined"}
      color="primary"
      size="small"
      startIcon={favorited ? <StarIcon /> : <StarBorderIcon />}
      sx={{ borderRadius: 999 }}
    >
      {favorited ? "Saved" : "Save"}
    </Button>
  );
}

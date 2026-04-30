"use client";

import { useState } from "react";
import { Button } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { toggleFavorite } from "@/lib/api/recipes";
import { useAuth } from "@/hooks/useAuth";

export default function FavoriteButton({
  recipeId,
  initial = false,
}: {
  recipeId: string;
  initial?: boolean;
}) {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(initial);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!user) return;
    setPending(true);
    const next = !favorited;
    setFavorited(next);
    try {
      await toggleFavorite(user.id, recipeId, next);
    } catch {
      setFavorited(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={pending || !user}
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

"use client";

import { useEffect, useState } from "react";
import { Button } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { isRecipeFavorited, toggleFavorite } from "@/lib/api/recipes";
import { useAuth } from "@/hooks/useAuth";

export default function FavoriteButton({ recipeId }: { recipeId: string }) {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) {
      setHydrated(true);
      setFavorited(false);
      return;
    }
    let cancelled = false;
    isRecipeFavorited(user.id, recipeId)
      .then((v) => {
        if (!cancelled) setFavorited(v);
      })
      .catch(() => {
        if (!cancelled) setFavorited(false);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, recipeId]);

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
      disabled={pending || !user || !hydrated}
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

"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Alert, Box, Container, Stack, Typography } from "@mui/material";
import PageHeader from "@/components/layout/PageHeader";
import FavoriteButton from "@/components/recipes/FavoriteButton";
import { getRecipeById } from "@/lib/api/recipes";
import type { Recipe } from "@/types/recipe";

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRecipeById(id)
      .then((r) => {
        if (cancelled) return;
        if (!r) {
          notFound();
          return;
        }
        setRecipe(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load recipe");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
        <PageHeader showBack />
        <Container maxWidth="sm" sx={{ py: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  if (loading || !recipe) {
    return (
      <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
        <PageHeader showBack />
        <Container maxWidth="sm" sx={{ py: 3 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Loading…
          </Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <PageHeader showBack action={<FavoriteButton recipeId={recipe.id} />} />

      {recipe.imageUrl && (
        <Box
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            bgcolor: "action.hover",
          }}
        >
          <Image
            src={recipe.imageUrl}
            alt=""
            fill
            sizes="(max-width: 600px) 100vw, 600px"
            style={{ objectFit: "cover" }}
            priority
          />
        </Box>
      )}

      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Stack spacing={4}>
          <Stack spacing={1}>
            <Typography variant="h4" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
              {recipe.title}
            </Typography>
            {recipe.description && (
              <Typography variant="body2" color="text.secondary">
                {recipe.description}
              </Typography>
            )}
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Ingredients
            </Typography>
            <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 0, listStyle: "none" }}>
              {recipe.ingredients.map((i) => (
                <Typography key={i} component="li" variant="body2" color="text.secondary">
                  • {i}
                </Typography>
              ))}
            </Stack>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
              Steps
            </Typography>
            <Stack component="ol" spacing={1} sx={{ m: 0, pl: 2.5 }}>
              {recipe.steps.map((s, idx) => (
                <Typography key={idx} component="li" variant="body2" color="text.secondary">
                  {s}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

"use client";

import Link from "next/link";
import { Card, CardActionArea, Stack, Typography } from "@mui/material";
import type { Recipe } from "@/types/recipe";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Card variant="outlined" sx={{ borderColor: "divider" }}>
      <CardActionArea component={Link} href={`/recipes/${recipe.id}`} sx={{ p: 2 }}>
        <Stack spacing={0.5}>
          <Typography fontWeight={500}>{recipe.title}</Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {recipe.description}
          </Typography>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

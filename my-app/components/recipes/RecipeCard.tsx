"use client";

import Link from "next/link";
import Image from "next/image";
import { Box, Card, CardActionArea, Stack, Typography } from "@mui/material";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import type { Recipe } from "@/types/recipe";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Card variant="outlined" sx={{ borderColor: "divider" }}>
      <CardActionArea component={Link} href={`/recipes/${recipe.id}`}>
        <Stack direction="row" sx={{ alignItems: "stretch" }}>
          <Box
            sx={{
              position: "relative",
              width: 96,
              minHeight: 96,
              flexShrink: 0,
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {recipe.imageUrl ? (
              <Image
                src={recipe.imageUrl}
                alt=""
                fill
                sizes="96px"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <RestaurantMenuIcon sx={{ color: "text.disabled" }} />
            )}
          </Box>

          <Stack spacing={0.5} sx={{ p: 2, flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 500 }}>
              {recipe.title}
            </Typography>
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
        </Stack>
      </CardActionArea>
    </Card>
  );
}

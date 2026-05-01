"use client";

import Link from "next/link";
import {
  Box,
  Card,
  CardActionArea,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import type { RecipeRecommendation } from "@/lib/api/recommend";

export default function RecommendationCard({
  rec,
}: {
  rec: RecipeRecommendation;
}) {
  const pct = Math.max(0, Math.min(100, rec.matchPercent));

  return (
    <Card variant="outlined" sx={{ borderColor: "divider" }}>
      <CardActionArea component={Link} href={`/recipes/${rec.id}`}>
        <Stack direction="row" sx={{ alignItems: "stretch" }}>
          <Box
            sx={{
              width: 64,
              minHeight: 64,
              flexShrink: 0,
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RestaurantMenuIcon sx={{ color: "text.disabled" }} />
          </Box>

          <Stack spacing={0.75} sx={{ p: 2, flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 500 }} noWrap>
              {rec.name}
            </Typography>

            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: "center", color: "text.secondary" }}
            >
              <Typography variant="caption" sx={{ whiteSpace: "nowrap" }}>
                {rec.matchedIngredientCount} / {rec.totalIngredientCount}{" "}
                ingredients
              </Typography>
              <Box sx={{ flex: 1, minWidth: 60 }}>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{ height: 6, borderRadius: 999 }}
                />
              </Box>
              <Typography variant="caption" sx={{ whiteSpace: "nowrap" }}>
                {pct.toFixed(0)}%
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

import { notFound } from "next/navigation";
import { Box, Container, Stack, Toolbar, Typography } from "@mui/material";
import BackButton from "@/components/layout/BackButton";
import FavoriteButton from "@/components/recipes/FavoriteButton";
import { getRecipeById } from "@/lib/api/recipes";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipeById(id);

  if (!recipe) notFound();

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <Toolbar sx={{ justifyContent: "space-between", gap: 1.5 }}>
        <BackButton />
        <FavoriteButton recipeId={recipe.id} />
      </Toolbar>

      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Stack spacing={4}>
          <Stack spacing={1}>
            <Typography variant="h4" fontWeight={600} letterSpacing="-0.02em">
              {recipe.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {recipe.description}
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle1" fontWeight={500}>
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
            <Typography variant="subtitle1" fontWeight={500}>
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

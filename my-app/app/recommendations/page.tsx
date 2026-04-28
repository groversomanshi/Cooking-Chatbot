import { Box, Container, Stack, Toolbar, Typography } from "@mui/material";
import BackButton from "@/components/layout/BackButton";
import RecipeCard from "@/components/recipes/RecipeCard";
import { getRecommendedRecipes } from "@/lib/api/recipes";

export default async function RecommendationsPage() {
  const recipes = await getRecommendedRecipes();

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <Toolbar sx={{ gap: 1.5 }}>
        <BackButton />
        <Typography variant="h6" fontWeight={500}>
          Recommended for you
        </Typography>
      </Toolbar>

      <Container maxWidth="sm" sx={{ py: 2 }}>
        {recipes.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ py: 6 }}
          >
            Scan some ingredients to get recommendations.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

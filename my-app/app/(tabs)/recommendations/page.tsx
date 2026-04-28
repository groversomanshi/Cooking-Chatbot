import { Container, Stack, Typography } from "@mui/material";
import PageHeader from "@/components/layout/PageHeader";
import RecipeCard from "@/components/recipes/RecipeCard";
import { getRecommendedRecipes } from "@/lib/api/recipes";

export default async function RecommendationsPage() {
  const recipes = await getRecommendedRecipes();

  return (
    <>
      <PageHeader title="Recommended for you" />

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
    </>
  );
}

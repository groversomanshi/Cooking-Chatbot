import { Container, Stack, Typography } from "@mui/material";
import PageHeader from "@/components/layout/PageHeader";
import RecipeCard from "@/components/recipes/RecipeCard";
import { getFavoriteRecipes } from "@/lib/api/recipes";

export default async function FavoritesPage() {
  const recipes = await getFavoriteRecipes();

  return (
    <>
      <PageHeader title="Favorites" />

      <Container maxWidth="sm" sx={{ py: 2 }}>
        {recipes.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ py: 6 }}
          >
            No favorites yet. Save recipes from the recommendations page.
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

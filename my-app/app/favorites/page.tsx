import { Box, Container, Stack, Toolbar, Typography } from "@mui/material";
import BackButton from "@/components/layout/BackButton";
import RecipeCard from "@/components/recipes/RecipeCard";
import { getFavoriteRecipes } from "@/lib/api/recipes";

export default async function FavoritesPage() {
  const recipes = await getFavoriteRecipes();

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <Toolbar sx={{ gap: 1.5 }}>
        <BackButton />
        <Typography variant="h6" fontWeight={500}>
          Favorites
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
    </Box>
  );
}

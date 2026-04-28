import { notFound } from "next/navigation";
import Image from "next/image";
import { Box, Container, Stack, Typography } from "@mui/material";
import PageHeader from "@/components/layout/PageHeader";
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

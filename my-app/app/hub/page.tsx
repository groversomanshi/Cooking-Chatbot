import { Box, Container, Stack, Typography } from "@mui/material";
import HubTile from "@/components/hub/HubTile";
import NavBar from "@/components/layout/NavBar";

export default function HubPage() {
  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <NavBar title="Home" />

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Typography variant="h4" fontWeight={600} letterSpacing="-0.02em">
            What&apos;s cooking?
          </Typography>

          <Stack spacing={1.5}>
            <HubTile
              href="/camera"
              title="Scan fridge"
              subtitle="Use your camera to log ingredients"
              emoji="📷"
            />
            <HubTile
              href="/recommendations"
              title="Recommended recipes"
              subtitle="Based on what you have"
              emoji="✨"
            />
            <HubTile
              href="/favorites"
              title="Favorites"
              subtitle="Your saved recipes"
              emoji="⭐"
            />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

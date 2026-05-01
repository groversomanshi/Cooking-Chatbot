import { Container, Stack, Typography } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import KitchenIcon from "@mui/icons-material/Kitchen";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import FavoriteIcon from "@mui/icons-material/Favorite";
import HubTile from "@/components/hub/HubTile";
import PageHeader from "@/components/layout/PageHeader";

export default function HubPage() {
  return (
    <>
      <PageHeader title="Home" />

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Typography variant="h4" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
            What&apos;s cooking?
          </Typography>

          <Stack spacing={1.5}>
            <HubTile
              href="/camera"
              title="Scan fridge"
              subtitle="Use your camera to log ingredients"
              icon={<PhotoCameraIcon />}
            />
            <HubTile
              href="/pantry"
              title="My pantry"
              subtitle="See what you have on hand"
              icon={<KitchenIcon />}
            />
            <HubTile
              href="/recommendations"
              title="Recommended recipes"
              subtitle="Based on what you have"
              icon={<AutoAwesomeIcon />}
            />
            <HubTile
              href="/favorites"
              title="Favorites"
              subtitle="Your saved recipes"
              icon={<FavoriteIcon />}
            />
          </Stack>
        </Stack>
      </Container>
    </>
  );
}

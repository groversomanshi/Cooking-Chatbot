import { Box, Container, Toolbar, Typography } from "@mui/material";
import BackButton from "@/components/layout/BackButton";
import CameraView from "@/components/camera/CameraView";

export default function CameraPage() {
  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "common.black", color: "common.white" }}>
      <Toolbar sx={{ gap: 1.5 }}>
        <BackButton />
        <Typography variant="h6" fontWeight={500}>
          Scan ingredients
        </Typography>
      </Toolbar>

      <Container maxWidth="sm" sx={{ pb: 4 }}>
        <CameraView />
      </Container>
    </Box>
  );
}

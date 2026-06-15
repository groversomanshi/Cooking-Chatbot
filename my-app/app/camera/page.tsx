import { Box, Container } from "@mui/material";
import PageHeader from "@/components/layout/PageHeader";
import CameraView from "@/components/camera/CameraView";

export default function CameraPage() {
  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <PageHeader title="Scan ingredients" showBack />

      <Container maxWidth="sm" sx={{ py: 2, pb: 4 }}>
        <CameraView />
      </Container>
    </Box>
  );
}

import { Box, Container } from "@mui/material";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        py: 6,
      }}
    >
      <Container maxWidth="xs">{children}</Container>
    </Box>
  );
}

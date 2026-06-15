import { Box } from "@mui/material";
import BottomNav from "@/components/layout/BottomNav";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", pb: 9 }}>
      {children}
      <BottomNav />
    </Box>
  );
}

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

export default function NavBar({ title }: { title: string }) {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        backdropFilter: "blur(8px)",
        bgcolor: "rgba(255, 255, 255, 0.8)",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar>
        <Typography variant="h6" fontWeight={500}>
          {title}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}

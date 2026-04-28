import { Button, Paper, Stack, Typography } from "@mui/material";
import type { ScannedItem } from "@/types/ingredient";

type Props = {
  item: ScannedItem;
  onRemove: () => void;
};

export default function ScannedItemCard({ item, onRemove }: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        borderColor: "divider",
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography fontWeight={500}>{item.name}</Typography>
        <Button onClick={onRemove} color="error" size="small">
          Remove
        </Button>
      </Stack>
    </Paper>
  );
}

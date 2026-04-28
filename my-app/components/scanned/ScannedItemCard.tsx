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
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Typography fontWeight={500}>{item.name}</Typography>
        <Button onClick={onRemove} color="error" size="small">
          Remove
        </Button>
      </Stack>
    </Paper>
  );
}

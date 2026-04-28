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
        <Stack sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontWeight={500} noWrap>
            {item.name}
          </Typography>
          {item.quantity && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {item.quantity}
            </Typography>
          )}
        </Stack>
        <Button onClick={onRemove} color="error" size="small">
          Remove
        </Button>
      </Stack>
    </Paper>
  );
}

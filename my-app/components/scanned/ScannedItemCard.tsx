import { Button, Paper, Stack, Tooltip, Typography } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlined";
import type { ScannedItem } from "@/types/ingredient";

type Props = {
  item: ScannedItem;
  onRemove: () => void;
};

export default function ScannedItemCard({ item, onRemove }: Props) {
  const unmatched = item.ingredientId == null;

  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderColor: "divider" }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Stack sx={{ minWidth: 0, flex: 1 }} direction="row" spacing={1} alignItems="center">
          <Stack sx={{ minWidth: 0 }}>
            <Typography fontWeight={500} noWrap>
              {item.name}
            </Typography>
            {item.quantity && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {item.quantity}
              </Typography>
            )}
          </Stack>
          {unmatched && (
            <Tooltip title="No matching ingredient in our list — this won't be added to your pantry.">
              <HelpOutlineIcon fontSize="small" color="warning" />
            </Tooltip>
          )}
        </Stack>
        <Button onClick={onRemove} color="error" size="small">
          Remove
        </Button>
      </Stack>
    </Paper>
  );
}

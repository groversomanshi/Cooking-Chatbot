"use client";

import { useRouter } from "next/navigation";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function BackButton() {
  const router = useRouter();

  return (
    <IconButton
      onClick={() => router.back()}
      aria-label="Go back"
      size="medium"
      sx={{ bgcolor: "action.hover" }}
    >
      <ArrowBackIcon fontSize="small" />
    </IconButton>
  );
}

"use client";

import { useContext } from "react";
import { PantryContext } from "@/context/PantryContext";

export function useScannedItems() {
  const ctx = useContext(PantryContext);
  if (!ctx) {
    throw new Error("useScannedItems must be used inside <PantryProvider>");
  }
  return ctx;
}

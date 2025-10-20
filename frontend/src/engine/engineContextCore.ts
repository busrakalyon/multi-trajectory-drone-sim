// src/engine/engineContextCore.ts
import { createContext, useContext } from "react";
import type { MapEngine } from "./mapengine";

export const EngineCtx = createContext<MapEngine | null>(null);

export function useMapEngine(): MapEngine {
  const ctx = useContext(EngineCtx);
  if (!ctx) throw new Error("useMapEngine must be used within EngineProvider");
  return ctx;
}

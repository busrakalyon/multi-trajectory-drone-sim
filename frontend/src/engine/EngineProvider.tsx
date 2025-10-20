// src/engine/EngineProvider.tsx
import React, { useEffect, useMemo } from "react";
import { MapEngine } from "./mapengine";
import { EngineCtx } from "./engineContextCore";

export function EngineProvider({ children }: { children: React.ReactNode }) {
  const engine = useMemo(() => new MapEngine(20), []);
  useEffect(() => {
    engine.start();
    return () => engine.stop();
  }, [engine]);
  return <EngineCtx.Provider value={engine}>{children}</EngineCtx.Provider>;
}

export default EngineProvider;

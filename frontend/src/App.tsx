// src/App.tsx
import React from "react";
import { EngineProvider } from "./engine/EngineProvider";
import Map from "./components/Map";

const App: React.FC = () => {
  return (
    <EngineProvider>
      <div className="h-screen w-screen flex flex-col">
        <h1 className="text-3xl font-bold text-center py-4 bg-gray-100">Multi Trajectory Drone Simulation</h1>
        <div className="flex-1">
          <Map />
        </div>
      </div>
    </EngineProvider>
  );
};

export default App;

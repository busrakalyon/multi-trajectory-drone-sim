<h1 align="center">🌍✈️ Multi-Trajectory Simulation Web App</h1>

<p align="center">
  <strong>Multi Trajectory Drone Simulation</strong> — a single-page React + TypeScript application that uses <code>Leaflet</code> for an interactive map-based UAV (drone) simulation. The app is wrapped with an <code>EngineProvider</code> that runs a lightweight task-based simulation engine; the <code>Map</code> component provides the UI, control panel, and modals for creating, editing and launching UAV flights and trajectories.
</p>

<p align="center">
  <img src="docs/demo.gif" width="700" alt="Simulation demo animation"/>
</p>

---

<h2>🚀 Overview</h2>

<p>
This repository focuses on a single-map simulation UI where users add UAV units, set a single target or multi-step trajectories, and run movements that are executed by a task engine. UAVs are represented as Leaflet markers, editable through a modal (<code>UAVModal</code>) and launched either individually (single target or trajectory) or as a batch simulation from the control board. The app synchronizes an authoritative simulation model (<code>MapObject</code>) with the React view state using a <code>useRaf</code> sampling loop.
</p>

---

<h2>🧩 Key Features</h2>

<ul>
  <li>🗺️ <strong>Single-page interactive map</strong> — The entire simulation runs on one map-focused page.</li>

  <li>🛰️ <strong>UAV lifecycle</strong> — Add UAVs at the current map center, edit name/start position, add/remove trajectory legs, and delete UAVs.</li>

  <li>🖱️ <strong>Map-pick integration</strong> — The <code>UAVModal</code> supports picking coordinates directly from the map for either the starting position or for adding a trajectory step; the map enters a short-lived map-pick mode and returns the clicked lat/lng via callback.</li>

  <li>⚙️ <strong>Task-based simulation engine</strong> — <code>MapEngine</code> runs at a configurable tick (default 20 ms) and executes <code>Task</code> objects:
    <ul>
      <li><code>MovingTask</code> — moves a marker toward a single target over a specified duration (computes per-second velocity and advances each tick).</li>
      <li><code>TrajectoryTask</code> — sequences multiple <code>TrajectoryLeg</code>s by internally creating and running <code>MovingTask</code>s for each leg.</li>
    </ul>
  </li>

  <li>▶️ <strong>Start flights</strong> — From the control panel you can:
    <ul>
      <li>Start a UAV’s single-target movement (<code>MovingTask</code>),</li>
      <li>Start its stored trajectory (<code>TrajectoryTask</code>), or</li>
      <li>Start a global simulation that schedules a trajectory task for every UAV that has a target or trajectory.</li>
    </ul>
  </li>

</ul>

---

<h2>Project Structure</h2>

<pre>
SRC/
├── components/
│   ├── ControlBoard.tsx     # UI panel for user interaction and data input
│   ├── Map.tsx              # Core Leaflet map with markers and layers
│   ├── MovementModal.tsx    # Controls simulation parameters and playback
│   └── UAVModal.tsx
│ 
├── engine/
│   ├── engineContextCore.ts
│   ├── EngineProvider.tsx
│   ├── mapengine.ts
│   ├── movingTask.ts
│   ├── task.ts
│   └── trajectoryTask.ts
│
├── simulation/
│   ├── IMap.ts
│   └── MapObject.ts
│
├── types/
│   └── uavData.ts
│
├── App.tsx
├── index.css
├── main.tsx
└── vite-env.d.ts
</pre>

---

<h2>Technical Details</h2>

<ul>
  <li>🏗️ <strong>Frontend Framework:</strong> React + TypeScript</li>
  <li>🗺️ <strong>Mapping Library:</strong> Leaflet</li>
  <li>⚙️ <strong>Build Tool:</strong> Vite</li>
  <li>🎨 <strong>Styling:</strong> Tailwind CSS (optional, extendable)</li>
  <li>📦 <strong>Package Manager:</strong> npm or yarn</li>
</ul>

---


<h2>How It Works</h2>

<ol>
  <li>
    <strong>UI & map initialization</strong> — The <code>Map</code> component initializes a Leaflet map and a <code>MapObject</code> instance. UAV markers are represented by Leaflet <code>Marker</code>s and stored both in React view state (<code>uavState</code>) and in <code>MapObject.uavs</code> for synchronization.
  </li>

  <li>
    <strong>Adding / editing UAVs</strong> — Users add UAVs from the control panel. Each UAV gets a generated id, a marker on the map, and is registered into <code>MapObject</code>. The <code>UAVModal</code> allows editing name, start coordinates, single-target duration or a multi-step <code>trajectory</code>. The modal supports selecting coordinates directly on the map via a map-pick callback.
  </li>

  <li>
    <strong>Map-pick flow</strong> — When the user chooses "pick from map" (for start or for trajectory step), the modal closes and <code>Map</code> enters a short-lived map-pick mode. The next map click invokes the registered callback which returns lat/lng to the modal logic and updates the UAV (via <code>onSave → MapObject.updateUAV</code>).
  </li>

  <li>
    <strong>Simulation engine (MapEngine)</strong> — A lightweight engine (<code>MapEngine</code>) runs at a configured tick interval (default 20 ms). The engine keeps a list of <code>Task</code>s and calls <code>run_next()</code> on each task every tick. Completed tasks are automatically removed.
  </li>

  <li>
    <strong>Primitive tasks</strong> —
    <ul>
      <li><code>MovingTask</code> — computes per-second velocities (vx, vy) from the marker's current position to the target and moves the marker by small increments each tick until the configured duration elapses; then it snaps to the final target and calls an optional <code>onDone</code> callback.</li>
      <li><code>TrajectoryTask</code> — accepts an ordered list of <code>TrajectoryLeg</code>s and executes them sequentially by internally creating/running <code>MovingTask</code>s for each leg; when all legs complete it invokes its <code>onDone</code> callback.</li>
    </ul>
  </li>

  <li>
    <strong>Starting flights</strong> — From the ControlBoard you can start:
    <ul>
      <li>a single-target flight (creates a <code>MovingTask</code>), or</li>
      <li>a trajectory flight (creates a <code>TrajectoryTask</code>), or</li>
      <li>a global simulation that collects all UAVs with either a target or a trajectory and schedules a <code>TrajectoryTask</code> per UAV.</li>
    </ul>
    Each scheduled task is added to <code>MapEngine</code> via <code>engine.addTask(task)</code>.
  </li>

  <li>
    <strong>State synchronization & rendering</strong> — The <code>Map</code> component uses a <code>useRaf</code> loop to sample the authoritative map/simulation state (markers and <code>MapObject.uavs</code>) and update the React view state only when values change. Marker positions are updated by the engine tasks (they call <code>marker.setLatLng</code>), and React state is adjusted to reflect marker position, target/trajectory, <code>isMoving</code> flags, and flight durations.
  </li>

  <li>
    <strong>Flight completion</strong> — When a flight leg or trajectory finishes, the task's <code>onDone</code> or <code>MapObject</code> callback updates the UAV data (clearing target/trajectory, resetting <code>isMoving</code>, and updating startPosition). The control UI reacts to these state changes (enables/disables buttons, updates lists).
  </li>

  <li>
    <strong>Deletion & cleanup</strong> — Removing a UAV removes its marker from the map, unregisters it from <code>MapObject</code>, and removes it from React state. Running tasks that reference removed markers will handle errors safely (try/catch) and the engine prunes completed tasks each tick.
  </li>
</ol>


---


<h2>Dependencies</h2>

<ul>
  <li><code>react</code></li>
  <li><code>react-dom</code></li>
  <li><code>react-router-dom</code></li>
  <li><code>leaflet</code></li>
  <li><code>@types/leaflet</code></li>
  <li><code>vite</code></li>
  <li><code>typescript</code></li>
</ul>


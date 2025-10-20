// src/engine/trajectoryTask.ts
import { Task } from "./task";
import { MovingTask } from "./movingTask";
import L from "leaflet";
import type { TrajectoryLeg } from "../types/uavData";

/**
 * TrajectoryTask
 * - Bir marker için verilen legs (TrajectoryLeg[]) listesini sırayla çalıştırır.
 * - Her adım için içten bir MovingTask yaratır ve onu run_next ile iter eder.
 * - onDone callback'i tüm adımlar tamamlandığında çağrılır.
 */
export class TrajectoryTask extends Task {
  private currentIndex = 0;
  private currentTask: MovingTask | null = null;
  private doneCalled = false;
  private readonly dtSec: number;

  constructor(
    private readonly marker: L.Marker,
    private readonly legs: TrajectoryLeg[],
    dtSec = 0.02,
    private readonly onDone?: () => void
  ) {
    super();
    this.dtSec = dtSec;
    if (!this.legs || this.legs.length === 0) {
      // boş dizi verilirse hemen tamamlanmış say
      this.doneCalled = true;
      try { this.onDone?.(); } catch (err) { console.error("[TrajectoryTask] onDone error", err); }
    }
  }

  private startNextLeg() {
    if (this.currentIndex >= this.legs.length) {
      if (!this.doneCalled) {
        this.doneCalled = true;
        try { this.onDone?.(); } catch (err) { console.error("[TrajectoryTask] onDone error", err); }
      }
      return;
    }

    const leg = this.legs[this.currentIndex];
    const target: L.LatLngExpression = [leg.lat, leg.lng];

    this.currentTask = new MovingTask(
      this.marker,
      target,
      leg.durationMs,
      this.dtSec,
      () => {
        // kesin son konumu ayarla 
        try { this.marker.setLatLng([leg.lat, leg.lng]); } catch { /* ignore */ }

        // sonraki leg'e geç
        this.currentIndex++;
        if (this.currentIndex < this.legs.length) {
          this.startNextLeg();
        } else {
          if (!this.doneCalled) {
            this.doneCalled = true;
            try { this.onDone?.(); } catch (err) { console.error("[TrajectoryTask] onDone error", err); }
          }
        }
      }
    );
  }

  run_next() {
    if (this.doneCalled) return;

    if (!this.currentTask) {
      if (this.legs.length === 0) {
        this.doneCalled = true;
        try { this.onDone?.(); } catch (err) { console.error("[TrajectoryTask] onDone error", err); }
        return;
      }
      this.startNextLeg();
    }

    if (this.currentTask) {
      try {
        this.currentTask.run_next();
      } catch (err) {
        console.error("[TrajectoryTask] inner MovingTask error", err);
      }
    }
  }

  is_done() {
    return this.doneCalled;
  }
}

export default TrajectoryTask;

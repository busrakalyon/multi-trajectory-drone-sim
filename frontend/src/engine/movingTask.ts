// src/engine/movingTask.ts
import { Task } from "./task";
import L from "leaflet";

/**
 * Marker'ı sabit hızla hedefe doğru taşır.
 * onDone: görev tamamlandığında çağrılır (optional)
 */
export class MovingTask extends Task {
  private elapsedSec = 0;
  private readonly durationSec: number;
  private readonly vx: number; // lat per sec
  private readonly vy: number; // lng per sec
  private doneCalled = false;

  constructor(
    private readonly marker: L.Marker,
    private readonly targetLatLng: L.LatLngExpression,
    durationMs: number,
    private readonly dtSec = 0.02,
    private readonly onDone?: () => void
  ) {
    super();
    this.durationSec = Math.max(0.001, durationMs / 1000);
    const start = marker.getLatLng();
    const target = L.latLng(targetLatLng);
    this.vx = (target.lat - start.lat) / this.durationSec;
    this.vy = (target.lng - start.lng) / this.durationSec;
  }

  run_next() {
    const moveLat = this.vx * this.dtSec;
    const moveLng = this.vy * this.dtSec;
    const current = this.marker.getLatLng();
    const newLat = current.lat + moveLat;
    const newLng = current.lng + moveLng;
    this.marker.setLatLng([newLat, newLng]);

    this.elapsedSec += this.dtSec;

    if (this.elapsedSec >= this.durationSec) {
      const target = L.latLng(this.targetLatLng);
      this.marker.setLatLng(target);
      if (!this.doneCalled) {
        this.doneCalled = true;
        if (typeof this.onDone === "function") {
          try { this.onDone(); } catch (e) { console.error("[MovingTask] onDone error", e); }
        }
      }
    }
  }

  is_done() {
    return this.elapsedSec >= this.durationSec;
  }
}

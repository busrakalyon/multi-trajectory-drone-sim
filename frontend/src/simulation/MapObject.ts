// simulation/MapObject.ts
import type { IMap } from "./IMap";
import type { UAVData } from "../types/uavData";
import L from "leaflet";

export interface MapObjectOptions {
  onFlightFinish?: (uav: UAVData) => void;
}

export class MapObject implements IMap {
  uavs: UAVData[] = [];
  private map: L.Map;
  private opts: MapObjectOptions;

  constructor(map: L.Map, opts?: MapObjectOptions) {
    this.map = map;
    this.opts = opts ?? {};
  }

  registerUAV(uav: UAVData) {
    // kolay senkronizasyon için aynı referans
    this.uavs.push(uav);
  }

  unregisterUAV(id: string) {
    this.uavs = this.uavs.filter(u => u.id !== id);
  }

  // UI tarafında kaydet dediğinde mapObject içindeki veriyi senkronize etmek için
  updateUAV(updated: {
    id: string;
    name?: string;
    startPosition?: { lat: number; lng: number; };
    targetPosition?: { lat: number; lng: number; } | null;
    flightDuration?: number;
    trajectory?: { lat: number; lng: number; durationMs: number; }[] | null;
  }) {
    const u = this.uavs.find(x => x.id === updated.id);
    if (!u) return;

    if (typeof updated.name === "string") u.name = updated.name;
    if (updated.startPosition) {
      u.startPosition = { ...updated.startPosition };
      if (u.marker) {
        u.marker.setLatLng([u.startPosition.lat, u.startPosition.lng]);
      }
    }
    if (typeof updated.targetPosition !== "undefined") {
      u.targetPosition = updated.targetPosition ?? null;
    }
    if (typeof updated.flightDuration === "number") {
      u.flightDuration = updated.flightDuration;
    }
    if (typeof updated.trajectory !== "undefined") {
      u.trajectory = updated.trajectory ?? [];
    }
    
  }

  startFlight(id: string, target: { lat: number; lng: number }, durationMs: number) {
    const u = this.uavs.find(x => x.id === id);
    if (!u || !u.marker) return;
    const start = u.marker.getLatLng();
    const durationSec = Math.max(0.001, durationMs / 1000);

    u.targetPosition = { lat: target.lat, lng: target.lng };
    u.flightDuration = durationMs;
    u.isMoving = true;
    u.remainingTimeSec = durationSec;
    u.velocity = {
      latPerSec: (target.lat - start.lat) / durationSec,
      lngPerSec: (target.lng - start.lng) / durationSec
    };
  }

  update(dt: number): void {
    for (const u of this.uavs) {
      if (!u.isMoving || !u.marker || !u.velocity || typeof u.remainingTimeSec === "undefined") continue;

      const moveLat = u.velocity.latPerSec * dt;
      const moveLng = u.velocity.lngPerSec * dt;

      const current = u.marker.getLatLng();
      const newLat = current.lat + moveLat;
      const newLng = current.lng + moveLng;
      u.marker.setLatLng([newLat, newLng]);

      u.remainingTimeSec -= dt;

      if (u.remainingTimeSec <= 0) {
        // kesin hedef pozisyonu ata
        if (u.targetPosition) {
          u.marker.setLatLng([u.targetPosition.lat, u.targetPosition.lng]);
          u.startPosition = { lat: u.targetPosition.lat, lng: u.targetPosition.lng };
        }
        u.isMoving = false;
        u.velocity = undefined;
        u.remainingTimeSec = undefined;
        u.flightDuration = 0;
        // React tarafına haber ver
        this.opts.onFlightFinish?.(u);
      }
    }
  }

  render(): void {
    
  }
}

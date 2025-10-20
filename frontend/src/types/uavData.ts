// src/types/uavData.ts
import type { Marker } from "leaflet";

export interface TrajectoryLeg {
  lat: number;
  lng: number;
  durationMs: number; 
}

export interface UAVData {
  id: string;
  name: string;

  startPosition: { lat: number; lng: number };
  targetPosition: { lat: number; lng: number } | null;

  flightDuration: number; // tek uçuş için 
  marker?: Marker;

  // trajectory için adımlar
  trajectory?: TrajectoryLeg[];
  currentLegIndex?: number;

  // Simülasyon için opsiyonel alanlar
  isMoving?: boolean;
  velocity?: { latPerSec: number; lngPerSec: number };
  remainingTimeSec?: number;
}

export interface UAVState {
  uavs: UAVData[];
  uavCounter: number;
}
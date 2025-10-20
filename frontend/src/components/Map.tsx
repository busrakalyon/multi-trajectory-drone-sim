// src/components/Map.tsx
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ControlBoard from "./ControlBoard";
import ms from "milsymbol";
import MovementModal from "./MovementModal";
import UAVModal from "./UAVModal";
import type { UAVData, UAVState, TrajectoryLeg } from "../types/uavData";
import { MapObject } from "../simulation/MapObject";
import { useMapEngine } from "../engine/engineContextCore";
import { MovingTask } from "../engine/movingTask";
import { TrajectoryTask } from "../engine/trajectoryTask";

/** useRaf: her frame'de çağrılan custom hook */
function useRaf(cb: () => void) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      try {
        cbRef.current();
      } finally {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

const Map: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const mapObjectRef = useRef<MapObject | null>(null);

  const engine = useMapEngine();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetCoords, setTargetCoords] = useState<L.LatLng | null>(null);
  const [selectedUAVId, setSelectedUAVId] = useState<string | null>(null);
  const selectedUAVIdRef = useRef<string | null>(selectedUAVId);

  // fare ile seçme için
  const mapPickCallbackRef = useRef<((lat: number, lng: number) => void) | null>(null);
  const mapPickModeRef = useRef<'start' | 'target' | 'trajectory' | null>(null);

  // UAV modal
  const [isUAVModalOpen, setIsUAVModalOpen] = useState(false);

  useEffect(() => {
    selectedUAVIdRef.current = selectedUAVId;
  }, [selectedUAVId]);

  // React'te gösterim için state (only view)
  const [uavState, setUavState] = useState<UAVState>({ uavs: [], uavCounter: 0 });

  // Haritayı başlat
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([39.9334, 32.8597], 11);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      // MapObject oluştur
      mapObjectRef.current = new MapObject(map, {
        onFlightFinish: (uav) => {
          // MapObject'ten gelen bitiş uyarısı varsa React state'i güncelle
          setUavState(prev => ({
            ...prev,
            uavs: prev.uavs.map(x => x.id === uav.id ? {
              ...x,
              startPosition: { ...uav.startPosition },
              targetPosition: null,
              flightDuration: 0,
              isMoving: false,
              trajectory: uav.trajectory ?? []
            } : x)
          }));
        }
      });

      // Harita click davranışı
      map.on("click", (e: L.LeafletMouseEvent) => {
        // eğer map-pick aktifse önce callback çağrılır
        if (mapPickCallbackRef.current) {
          const cb = mapPickCallbackRef.current;
          try {
            cb(e.latlng.lat, e.latlng.lng);
          } finally {
            mapPickCallbackRef.current = null;
            mapPickModeRef.current = null;
            const container = mapInstanceRef.current?.getContainer();
            if (container) container.style.cursor = "";
          }
          return;
        }
        // seçili unsuru hedef atamak için aç
        if (selectedUAVIdRef.current) {
          setTargetCoords(e.latlng);
          setIsModalOpen(true);
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // useRaf ile engine modelinden React state'e örnekleme (kopyalama)
  useRaf(() => {
    const mapObj = mapObjectRef.current;
    if (!mapObj) return;

    const engineUavs = mapObj.uavs;
    // Hızlı karşılaştırma ve yalnızca değişiklik varsa setState:
    setUavState(prev => {
      // Eğer uzunluk farklıysa mutlaka değişiklik var
      if (prev.uavs.length !== engineUavs.length) {
        const next = engineUavs.map(eu => ({
          id: eu.id,
          name: eu.name,
          startPosition: eu.marker ? { lat: eu.marker.getLatLng().lat, lng: eu.marker.getLatLng().lng } : { ...eu.startPosition },
          targetPosition: eu.targetPosition ? { ...eu.targetPosition } : null,
          flightDuration: eu.flightDuration,
          marker: eu.marker,
          isMoving: !!eu.isMoving,
          trajectory: eu.trajectory ? eu.trajectory.map(t => ({ ...t })) : []
        } as UAVData));
        return { ...prev, uavs: next };
      }

      // aynı uzunluk: her elemanı karşılaştır
      let changed = false;
      const nextUavs: UAVData[] = prev.uavs.map(prevU => {
        const eu = engineUavs.find(x => x.id === prevU.id);
        if (!eu) { changed = true; return prevU; } // (varsa silinmiş)
        const markerPos = eu.marker ? eu.marker.getLatLng() : eu.startPosition;
        const sLat = +markerPos.lat;
        const sLng = +markerPos.lng;

        if (
          prevU.startPosition.lat !== sLat ||
          prevU.startPosition.lng !== sLng ||
          (prevU.targetPosition?.lat ?? null) !== (eu.targetPosition?.lat ?? null) ||
          (prevU.targetPosition?.lng ?? null) !== (eu.targetPosition?.lng ?? null) ||
          prevU.flightDuration !== eu.flightDuration ||
          !!prevU.isMoving !== !!eu.isMoving
        ) {
          changed = true;
          return {
            ...prevU,
            startPosition: { lat: sLat, lng: sLng },
            targetPosition: eu.targetPosition ? { ...eu.targetPosition } : null,
            flightDuration: eu.flightDuration,
            marker: eu.marker,
            isMoving: !!eu.isMoving,
            trajectory: eu.trajectory ? eu.trajectory.map(t => ({ ...t })) : []
          };
        }
        return prevU;
      });

      if (changed) {
        return { ...prev, uavs: nextUavs };
      }
      return prev;
    });
  });

  // UAV ikonu
  const createUAVIcon = () => {
    const symbol = new ms.Symbol("SUAPMFQM--GI", {
      size: 40,
      uniqueDesignation: "UAV ISR",
      fillColor: "#0000ff",
    });

    return L.icon({
      iconUrl: symbol.toDataURL(),
      iconSize: [80, 80],
      iconAnchor: [40, 40],
    });
  };

  // UAV ekleme
  const handleAddUAV = () => {
    if (!mapInstanceRef.current) return;
    const center = mapInstanceRef.current.getCenter();
    const newUAVCounter = uavState.uavCounter + 1;
    const newUAVId = `uav_${Date.now()}_${newUAVCounter}`;
    const newUAVName = `UAV ${newUAVCounter}`;

    const icon = createUAVIcon();
    const marker = L.marker([center.lat, center.lng], { icon })
      .addTo(mapInstanceRef.current)
      .bindPopup(`🔵 ♦️ ${newUAVName}`);

    marker.on('click', (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      setSelectedUAVId(newUAVId);
      setIsUAVModalOpen(true);
    });

    const newUAV: UAVData = {
      id: newUAVId,
      name: newUAVName,
      startPosition: { lat: center.lat, lng: center.lng },
      targetPosition: null,
      flightDuration: 0,
      marker: marker,
      isMoving: false,
      trajectory: []
    };

    // MapObject veri deposuna kaydet
    mapObjectRef.current?.registerUAV(newUAV);

    setUavState(prevState => {
      const newState = {
        uavs: [...prevState.uavs, newUAV],
        uavCounter: newUAVCounter
      };
      if (prevState.uavs.length === 0) {
        setSelectedUAVId(newUAVId);
      }
      return newState;
    });
  };

  const selectedUAV = uavState.uavs.find(uav => uav.id === selectedUAVId) || null;

  // MovementModal onConfirm -> engine.addTask ile hareket başlat
  const handleModalConfirm = (duration: number) => {
    if (selectedUAV && targetCoords && selectedUAV.marker) {
      // view state güncelle
      setUavState(prev => ({
        ...prev,
        uavs: prev.uavs.map(u => u.id === selectedUAV.id ? {
          ...u,
          targetPosition: { lat: targetCoords.lat, lng: targetCoords.lng },
          flightDuration: duration
        } : u)
      }));

      // MovingTask oluştur ve engine'e ekle
      const task = new MovingTask(
        selectedUAV.marker,
        [targetCoords.lat, targetCoords.lng],
        duration,
        0.02,
        () => {
          // tamamlandığında view state'i güncelle
          setUavState(prev => ({
            ...prev,
            uavs: prev.uavs.map(u => u.id === selectedUAV.id ? {
              ...u,
              startPosition: u.targetPosition ? { ...u.targetPosition } : u.startPosition,
              targetPosition: null,
              flightDuration: 0,
              isMoving: false
            } : u)
          }));
          // MapObject senkronizasyonu
          mapObjectRef.current?.updateUAV({
            id: selectedUAV.id,
            startPosition: selectedUAV.targetPosition ?? undefined,
            targetPosition: null,
            flightDuration: 0
          });
        }
      );

      engine.addTask(task);

      // UI'da isMoving flag
      setUavState(prev => ({
        ...prev,
        uavs: prev.uavs.map(u => u.id === selectedUAV.id ? { ...u, isMoving: true } : u)
      }));

      // MapObject'e hedef bilgisini koy
      mapObjectRef.current?.updateUAV({
        id: selectedUAV.id,
        targetPosition: { lat: targetCoords.lat, lng: targetCoords.lng },
        flightDuration: duration
      });
    }

    setIsModalOpen(false);
    setTargetCoords(null);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTargetCoords(null);
  };

  const handleSaveUAVFromModal = (updated: {
    id: string;
    name?: string;
    startPosition?: { lat: number; lng: number; };
    targetPosition?: { lat: number; lng: number; } | null;
    flightDuration?: number;
    trajectory?: TrajectoryLeg[] | null;
  }) => {
    setUavState(prevState => {
      return {
        ...prevState,
        uavs: prevState.uavs.map(uav => {
          if (uav.id !== updated.id) return uav;
          const marker = uav.marker;
          if (marker && (updated.startPosition && (uav.startPosition.lat !== updated.startPosition.lat || uav.startPosition.lng !== updated.startPosition.lng))) {
            marker.setLatLng([updated.startPosition!.lat, updated.startPosition!.lng]);
            mapInstanceRef.current?.panTo([updated.startPosition!.lat, updated.startPosition!.lng]);
          }
          return {
            ...uav,
            name: typeof updated.name === "string" ? updated.name : uav.name,
            startPosition: updated.startPosition ? { ...updated.startPosition } : uav.startPosition,
            targetPosition: typeof updated.targetPosition === "undefined" ? uav.targetPosition : updated.targetPosition,
            flightDuration: typeof updated.flightDuration === "number" ? updated.flightDuration : uav.flightDuration,
            marker,
            trajectory: updated.trajectory ? updated.trajectory.map(l => ({ ...l })) : uav.trajectory ?? []
          };
        })
      };
    });

    mapObjectRef.current?.updateUAV({
      id: updated.id,
      name: typeof updated.name === "string" ? updated.name : undefined,
      startPosition: updated.startPosition ? updated.startPosition : undefined,
      targetPosition: typeof updated.targetPosition === "undefined" ? undefined : updated.targetPosition,
      flightDuration: typeof updated.flightDuration === "number" ? updated.flightDuration : undefined,
      trajectory: typeof updated.trajectory === "undefined" ? undefined : (updated.trajectory ?? [])
    });

    setIsUAVModalOpen(false);
  };

  const handleControlSelect = (id: string) => setSelectedUAVId(id);
  const handleEditUAV = (id: string) => { setSelectedUAVId(id); setIsUAVModalOpen(true); };

  const handleStartFlight = (id: string) => {
    const uav = uavState.uavs.find(u => u.id === id);
    if (!uav || !uav.marker) return;

    // Eğer trajectory varsa onu çalıştır
    if (uav.trajectory && uav.trajectory.length > 0) {
      const legs = uav.trajectory.map(l => ({ ...l }));
      const task = new TrajectoryTask(uav.marker, legs, 0.02, () => {
        setUavState(prev => ({
          ...prev,
          uavs: prev.uavs.map(x => x.id === id ? {
            ...x,
            startPosition: legs.length > 0 ? { lat: legs[legs.length - 1].lat, lng: legs[legs.length - 1].lng } : x.startPosition,
            targetPosition: null,
            trajectory: [],
            flightDuration: 0,
            isMoving: false
          } : x)
        }));

        mapObjectRef.current?.updateUAV({
          id,
          startPosition: legs.length > 0 ? { lat: legs[legs.length - 1].lat, lng: legs[legs.length - 1].lng } : undefined,
          targetPosition: null,
          flightDuration: 0,
          trajectory: []
        });
      });

      engine.addTask(task);
      setUavState(prev => ({ ...prev, uavs: prev.uavs.map(x => x.id === id ? { ...x, isMoving: true } : x) }));
      return;
    }

    // Tek hedefli hareket 
    if (uav.targetPosition && uav.flightDuration > 0) {
      const task = new MovingTask(
        uav.marker,
        [uav.targetPosition.lat, uav.targetPosition.lng],
        uav.flightDuration,
        0.02,
        () => {
          setUavState(prev => ({
            ...prev,
            uavs: prev.uavs.map(x => x.id === id ? {
              ...x,
              startPosition: x.targetPosition ? { ...x.targetPosition } : x.startPosition,
              targetPosition: null,
              flightDuration: 0,
              isMoving: false
            } : x)
          }));
          mapObjectRef.current?.updateUAV({
            id,
            startPosition: uav.targetPosition ?? undefined,
            targetPosition: null,
            flightDuration: 0
          });
        }
      );
      engine.addTask(task);
      setUavState(prev => ({ ...prev, uavs: prev.uavs.map(x => x.id === id ? { ...x, isMoving: true } : x) }));
    }
  };

  const handleEnableMapPick = (mode: 'start' | 'target' | 'trajectory', cb: (lat: number, lng: number) => void) => {
    mapPickModeRef.current = mode;
    mapPickCallbackRef.current = cb;
    const container = mapInstanceRef.current?.getContainer();
    if (container) container.style.cursor = "crosshair";
  };

  // Simülasyon durumları
  const [simulationRunning, setSimulationRunning] = useState(false);
  const activeSimCountRef = useRef(0);

  const handleStartSimulation = () => {
    if (!mapObjectRef.current) return;
    const tasks: { uavId: string; task: TrajectoryTask }[] = [];

    for (const u of uavState.uavs) {
      if (!u.marker) continue;

      let legs: TrajectoryLeg[] = [];
      if (u.trajectory && u.trajectory.length > 0) {
        legs = u.trajectory.map(l => ({ ...l }));
      } else if (u.targetPosition && u.flightDuration > 0) {
        legs = [{ lat: u.targetPosition.lat, lng: u.targetPosition.lng, durationMs: u.flightDuration }];
      }

      if (legs.length === 0) continue;

      const task = new TrajectoryTask(u.marker, legs, 0.02, () => {
        // tamamlandığında view state güncelle
        setUavState(prev => ({
          ...prev,
          uavs: prev.uavs.map(x => x.id === u.id ? {
            ...x,
            startPosition: legs.length > 0 ? { lat: legs[legs.length - 1].lat, lng: legs[legs.length - 1].lng } : x.startPosition,
            targetPosition: null,
            trajectory: [],
            flightDuration: 0,
            isMoving: false
          } : x)
        }));

        mapObjectRef.current?.updateUAV({
          id: u.id,
          startPosition: legs.length > 0 ? { lat: legs[legs.length - 1].lat, lng: legs[legs.length - 1].lng } : undefined,
          targetPosition: null,
          flightDuration: 0,
          trajectory: []
        });

        activeSimCountRef.current -= 1;
        if (activeSimCountRef.current <= 0) {
          activeSimCountRef.current = 0;
          setSimulationRunning(false);
        }
      });

      tasks.push({ uavId: u.id, task });
    }

    if (tasks.length === 0) return;

    activeSimCountRef.current = tasks.length;
    setSimulationRunning(true);

    setUavState(prev => ({
      ...prev,
      uavs: prev.uavs.map(x => tasks.find(t => t.uavId === x.id) ? { ...x, isMoving: true } : x)
    }));

    for (const t of tasks) {
      engine.addTask(t.task);
    }
  };

  // Unsur silme
  const handleDeleteUAV = (id: string) => {
    // React state'ten çıkar
    setUavState(prev => {
      const toRemove = prev.uavs.find(u => u.id === id);
      // harita üzerindeki marker'ı kaldır
      if (toRemove && toRemove.marker) {
        try {
          toRemove.marker.remove();
        } catch { /* ignore */ }
      }
      return {
        ...prev,
        uavs: prev.uavs.filter(u => u.id !== id)
      };
    });

    // MapObject'ten kaldır
    mapObjectRef.current?.unregisterUAV(id);

    // Eğer seçili UAV silindiyse temizle ve modal kapat
    if (selectedUAVIdRef.current === id) {
      setSelectedUAVId(null);
      setIsUAVModalOpen(false);
      setIsModalOpen(false);
      setTargetCoords(null);
    }
  };

  return (
    <div className="flex h-full w-full">
      <ControlBoard
        onAddIHA={handleAddUAV}
        uavList={uavState.uavs}
        selectedUAVId={selectedUAVId}
        onSelectUAV={handleControlSelect}
        onEditUAV={handleEditUAV}
        onStartFlight={handleStartFlight}
        onDeleteUAV={handleDeleteUAV}
        simulationAvailable={uavState.uavs.some(u => (u.trajectory && u.trajectory.length > 0) || !!u.targetPosition)}
        simulationRunning={simulationRunning}
        onStartSimulation={handleStartSimulation}
      />
      <div ref={mapContainerRef} className="flex-1" style={{ height: "100vh" }} />
      <MovementModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        selectedUAVName={selectedUAV?.name || ""}
      />
      <UAVModal
        isOpen={isUAVModalOpen}
        onClose={() => setIsUAVModalOpen(false)}
        uav={selectedUAV}
        onSave={handleSaveUAVFromModal}
        onEnableMapPick={handleEnableMapPick}
      />
    </div>
  );
};

export default Map;
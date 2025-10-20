// src/components/UAVModal.tsx
import React, { useEffect, useState } from "react";
import type { UAVData, TrajectoryLeg } from "../types/uavData";

interface UAVModalProps {
  isOpen: boolean;
  onClose: () => void;
  uav: UAVData | null;
  onSave: (updated: {
    id: string;
    name: string;
    startPosition: { lat: number; lng: number; };
    targetPosition?: { lat: number; lng: number; } | null;
    flightDuration?: number;
    trajectory?: TrajectoryLeg[] | null;
  }) => void;

  // Haritadan seçim için: 'start' (başlangıç) veya 'trajectory' (yeni trajectory adımı ekleme)
  onEnableMapPick: (mode: 'start' | 'trajectory', cb: (lat: number, lng: number) => void) => void;
}

const UAVModal: React.FC<UAVModalProps> = ({ isOpen, onClose, uav, onSave, onEnableMapPick }) => {
  const [name, setName] = useState("");
  const [startLat, setStartLat] = useState<number | "">("");
  const [startLng, setStartLng] = useState<number | "">("");
  const [duration, setDuration] = useState<number | "">(1000);

  // trajectory edit için local state
  const [legs, setLegs] = useState<TrajectoryLeg[]>([]);
  const [newLegLat, setNewLegLat] = useState<number | "">("");
  const [newLegLng, setNewLegLng] = useState<number | "">("");
  const [newLegDuration, setNewLegDuration] = useState<number | "">(1000);

  useEffect(() => {
    if (uav) {
      setName(uav.name);
      setStartLat(Number(uav.startPosition.lat.toFixed(6)));
      setStartLng(Number(uav.startPosition.lng.toFixed(6)));
      setDuration(uav.flightDuration ? uav.flightDuration : 1000);
      setLegs(uav.trajectory ? uav.trajectory.map(l => ({ ...l })) : []);
    } else {
      setName("");
      setStartLat("");
      setStartLng("");
      setDuration(1000);
      setLegs([]);
    }
  }, [uav]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!uav) return;

    if (name.trim() === "" || startLat === "" || startLng === "") {
      alert("Lütfen en azından isim ve başlangıç koordinatlarını girin.");
      return;
    }

    const updated = {
      id: uav.id,
      name: name.trim(),
      startPosition: { lat: Number(startLat), lng: Number(startLng) },
      targetPosition: uav.targetPosition ?? null,
      flightDuration: typeof duration === "number" ? duration : (uav.flightDuration || 0),
      trajectory: legs.length > 0 ? legs.map(l => ({ ...l })) : []
    };

    onSave(updated);
  };

  // Fare ile başlangıç seçimi başlat - modal kapanır
  const handlePickStart = () => {
    if (!uav) return;
    onClose();
    onEnableMapPick('start', (lat, lng) => {
      const updated = {
        id: uav.id,
        name: name.trim(),
        startPosition: { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) },
        targetPosition: uav.targetPosition ?? null,
        flightDuration: typeof duration === "number" ? duration : (uav.flightDuration || 0),
        trajectory: legs.length > 0 ? legs.map(l => ({ ...l })) : []
      };
      onSave(updated);
    });
  };

  // Fare ile trajectory adımı ekleme - modal kapanır
  const handlePickTrajectoryStep = () => {
    if (!uav) return;
    onClose();
    onEnableMapPick('trajectory', (lat, lng) => {
      const leg: TrajectoryLeg = {
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        durationMs: typeof newLegDuration === "number" ? newLegDuration : 1000
      };

      const updated = {
        id: uav.id,
        name: name.trim(),
        startPosition: { lat: Number(startLat), lng: Number(startLng) },
        targetPosition: uav.targetPosition ?? null,
        flightDuration: typeof duration === "number" ? duration : (uav.flightDuration || 0),
        trajectory: [...legs.map(l => ({ ...l })), leg]
      };

      onSave(updated);
    });
  };

  // Trajectory: yeni leg ekle (manuel form)
  const handleAddLeg = () => {
    if (newLegLat === "" || newLegLng === "" || newLegDuration === "") {
      alert("Yeni hedef için lat, lng ve süre girin.");
      return;
    }
    const leg: TrajectoryLeg = {
      lat: Number(newLegLat),
      lng: Number(newLegLng),
      durationMs: Number(newLegDuration)
    };
    setLegs(prev => [...prev, leg]);
    setNewLegLat("");
    setNewLegLng("");
    setNewLegDuration(1000);
  };

  const handleRemoveLeg = (idx: number) => {
    setLegs(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black/50 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] p-6 w-full max-w-[640px] max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">UAV Düzenle</h2>
          <button onClick={onClose} className="text-gray-500">Kapat ✕</button>
        </div>

        {!uav ? (
          <p>Seçili unsur yok.</p>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">İsim</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="border rounded p-2 w-full" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">Başlangıç Lat</label>
                  <input type="number" step="0.000001" value={startLat} onChange={(e) => setStartLat(e.target.value === "" ? "" : Number(e.target.value))} className="border rounded p-2 w-full" />
                </div>

                <div>
                  <label className="block text-sm font-medium">Başlangıç Lng</label>
                  <input type="number" step="0.000001" value={startLng} onChange={(e) => setStartLng(e.target.value === "" ? "" : Number(e.target.value))} className="border rounded p-2 w-full" />
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <button onClick={handlePickStart} className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">
                  🖱️ Haritadan Seç
                </button>
              </div>

              <hr className="my-4" />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Hedef</h3>
                </div>

                {legs.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-2">Henüz adım yok. Aşağıdan adım ekleyebilirsiniz veya haritadan seçin.</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {legs.map((leg, idx) => (
                      <div key={idx} className="p-2 border rounded flex items-center justify-between gap-2">
                        <div className="text-sm">
                          <div><strong>{idx + 1}. Hedef: </strong> {leg.lat.toFixed(6)}, {leg.lng.toFixed(6)}</div>
                          <div className="text-xs text-gray-600">Süre: {leg.durationMs / 1000} sn</div>
                        </div>
                        <div>
                          <button onClick={() => handleRemoveLeg(idx)} className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">Sil</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="block text-xs">Lat</label>
                    <input type="number" step="0.000001" value={newLegLat} onChange={(e) => setNewLegLat(e.target.value === "" ? "" : Number(e.target.value))} className="border rounded p-2 w-full" />
                  </div>
                  <div>
                    <label className="block text-xs">Lng</label>
                    <input type="number" step="0.000001" value={newLegLng} onChange={(e) => setNewLegLng(e.target.value === "" ? "" : Number(e.target.value))} className="border rounded p-2 w-full" />
                  </div>
                  <div>
                    <label className="block text-xs">Süre (ms)</label>
                    <input type="number" value={newLegDuration} onChange={(e) => setNewLegDuration(e.target.value === "" ? "" : Number(e.target.value))} className="border rounded p-2 w-full" />
                  </div>
                </div>

                <div className="mt-2">
                  <button onClick={handlePickTrajectoryStep} className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">🖱️ Haritadan Hedef Ekle</button>
                </div>

                <div className="mt-2">
                  <button onClick={handleAddLeg} className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Hedef Ekle</button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded-md">İptal</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-md">Kaydet</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UAVModal;

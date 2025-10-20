// src/components/ControlBoard.tsx
import React from "react";
import type { UAVData } from "../types/uavData";

interface ControlBoardProps {
  onAddIHA: () => void;
  uavList: UAVData[];
  selectedUAVId: string | null;
  onSelectUAV: (id: string) => void;
  onEditUAV: (id: string) => void;
  onStartFlight: (id: string) => void;
  onDeleteUAV: (id: string) => void;

  simulationAvailable?: boolean;
  simulationRunning?: boolean;
  onStartSimulation?: () => void;
}

const ControlBoard: React.FC<ControlBoardProps> = ({
  onAddIHA,
  uavList,
  selectedUAVId,
  onSelectUAV,
  onEditUAV,
  onStartFlight,
  onDeleteUAV,
  simulationAvailable = false,
  simulationRunning = false,
  onStartSimulation
}) => {
  return (
    <div className="w-1/4 bg-gray-100 p-4 overflow-y-auto">
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Kontrol Paneli</h2>

        <div className="space-y-2">
          <button
            onClick={onAddIHA}
            disabled={simulationRunning}
            className={`w-full px-3 py-2 rounded-md transition-colors duration-200 ${
              simulationRunning ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            <span className="text-lg mr-2">＋</span>
            <span>Unsur Ekle</span>
          </button>

          {simulationAvailable && onStartSimulation && (
            <button
              onClick={onStartSimulation}
              disabled={simulationRunning}
              className={`w-full px-3 py-2 rounded-md transition-colors duration-200 ${
                simulationRunning ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-700'
              }`}
            >
              ▶ Simülasyon Başlat
            </button>
          )}
        </div>

        <div>
          <h3 className="text-md font-medium mb-3">
            Unsur Listesi ({uavList.length})
          </h3>

          {uavList.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Henüz unsur eklenmedi</p>
          ) : (
            <div className="space-y-3">
              {uavList.map((uav, index) => {
                const isSelected = selectedUAVId === uav.id;

                const canStartFlight = (
                  (uav.targetPosition && uav.flightDuration > 0) ||
                  (uav.trajectory && uav.trajectory.length > 0)
                );

                return (
                  <div
                    key={uav.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectUAV(uav.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectUAV(uav.id);
                      }
                    }}
                    className={`p-3 rounded-lg shadow-sm border transition-all duration-200 focus:outline-none ${
                      isSelected
                        ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300 cursor-pointer'
                        : 'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-semibold ${isSelected ? 'text-blue-800' : 'text-blue-700'}`}>
                        🔵 {uav.name}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {isSelected && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                            Seçili
                          </span>
                        )}
                        <span className="text-xs text-gray-500">#{index + 1}</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1 mb-3">
                      <div>
                        <strong>Başlangıç:</strong>
                        <br />
                        {uav.startPosition.lat.toFixed(4)}, {uav.startPosition.lng.toFixed(4)}
                      </div>


                      {uav.trajectory && uav.trajectory.length > 0 && (
                        <div>
                          <strong>Rota:</strong> {uav.trajectory.length} adım
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditUAV(uav.id); }}
                        className="px-3 py-2 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                      >
                        Düzenle
                      </button>

                      {canStartFlight ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); onStartFlight(uav.id); }}
                          className="px-3 py-2 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        >
                          ✈️Uçuş Başlat
                        </button>
                      ) : (
                        <button
                          onClick={(e) => e.stopPropagation()}
                          disabled
                          className="px-3 py-2 text-xs bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                        >
                          ✈️ Hedef Oluştur
                        </button>
                      )}

                      {/* Sil butonu */}
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm('Bu unsuru silmek istediğinize emin misiniz?')) onDeleteUAV(uav.id); }}
                        className="px-3 py-2 text-xs bg-red-500 text-white rounded hover:bg-red-900 transition-colors"
                        aria-label={`Sil ${uav.name}`}
                      >
                        ❌ Sil
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlBoard;
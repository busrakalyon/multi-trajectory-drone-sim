import { useState } from "react";

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (duration: number) => void;
  selectedUAVName: string;
}

const MovementModal = ({
  isOpen,
  onClose,
  onConfirm,
  selectedUAVName,
}: MovementModalProps) => {
  const [duration, setDuration] = useState<number>(1000);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black/50 z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] p-6 w-full max-w-[400px] text-center">
        <h2 className="text-xl font-bold mb-4">
          🛩️ Hareket Süresi
        </h2>

        {/* Seçilen unsurun adı gösteriliyor */}
        <p className="text-gray-700 font-medium mb-2">
          Seçilen Unsur: <span className="text-blue-600">{selectedUAVName}</span>
        </p>

        <p className="text-gray-600 mb-4">
          Unsurun hedef noktaya ulaşması için süreyi (milisaniye) giriniz.
        </p>

        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="border border-gray-300 rounded-md p-2 w-full mb-4"
          placeholder="Süre (ms)"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-md cursor-pointer"
          >
            İptal
          </button>
          <button
            onClick={() => onConfirm(duration)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovementModal;

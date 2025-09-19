
import React from 'react';
import { ROOM_TYPES } from '../constants';

interface RoomTypeSelectorProps {
  selectedRoomType: string;
  onRoomTypeChange: (roomType: string) => void;
}

export const RoomTypeSelector: React.FC<RoomTypeSelectorProps> = ({ selectedRoomType, onRoomTypeChange }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg w-full">
      <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-100 mb-4 text-center">3. Select Room Type</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ROOM_TYPES.map((roomType) => (
          <button
            key={roomType}
            onClick={() => onRoomTypeChange(roomType)}
            className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out border-2
              ${selectedRoomType === roomType
                ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400'
              }`}
          >
            {roomType}
          </button>
        ))}
      </div>
    </div>
  );
};

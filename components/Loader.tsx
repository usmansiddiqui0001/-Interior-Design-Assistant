
import React from 'react';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-24 h-24">
        <div className="absolute border-4 border-indigo-200 dark:border-indigo-800 rounded-full w-full h-full"></div>
        <div className="absolute border-4 border-t-indigo-600 border-l-indigo-600 border-b-transparent border-r-transparent rounded-full w-full h-full animate-spin"></div>
      </div>
      <p className="mt-6 text-lg font-semibold text-slate-600 dark:text-slate-300">Dreaming up your new design...</p>
      <p className="text-slate-500 dark:text-slate-400">This can take up to 30 seconds.</p>
    </div>
  );
};

import React from 'react';
import { DESIGN_STYLES } from '../constants';

interface StyleSelectorProps {
  selectedStyle: string;
  onStyleChange: (style: string) => void;
}

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onStyleChange }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg w-full">
      <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-100 mb-4 text-center">4. Choose a Style</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {DESIGN_STYLES.map((style) => (
          <button
            key={style}
            onClick={() => onStyleChange(style)}
            className={`px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out border-2
              ${selectedStyle === style
                ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400'
              }`}
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  );
};


import React from 'react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
    theme: 'light' | 'dark';
    onToggle: () => void;
}

const PaintBrushIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);


export const Header: React.FC<HeaderProps> = ({ theme, onToggle }) => {
  return (
    <header className="bg-white dark:bg-slate-800 shadow-md dark:shadow-slate-700/50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
            <PaintBrushIcon />
            <h1 className="ml-3 text-2xl font-bold text-slate-700 dark:text-slate-100 tracking-tight">
            AI Interior Design Assistant
            </h1>
        </div>
        <ThemeToggle theme={theme} onToggle={onToggle} />
      </div>
    </header>
  );
};